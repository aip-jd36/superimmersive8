// ============================
// Rights Verified Submission API
// Vercel Serverless Function
// ============================

const Airtable = require('airtable');
const { Resend } = require('resend');

// Initialize services
const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY });
const base = airtable.base(process.env.AIRTABLE_BASE_ID);
const resend = new Resend(process.env.RESEND_API_KEY);

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ message: 'OK' });
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // Parse request body
        const data = req.body;

        console.log('Received submission:', data.filmmaker.email);

        // Server-side validation
        const validationErrors = validateSubmission(data);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: validationErrors
            });
        }

        // Rate limiting check
        const isRateLimited = await checkRateLimit(data.filmmaker.email);
        if (isRateLimited) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Maximum 5 submissions per day.'
            });
        }

        // Generate submission ID
        const submissionId = await generateSubmissionId();

        // Process file info (store file names/sizes as text for now)
        const receiptsInfo = processFileInfo(data.files.receipts);
        const supportingDocsInfo = processFileInfo(data.files.supportingDocs);

        // Create Airtable record
        const record = await createAirtableRecord(submissionId, data, receiptsInfo, supportingDocsInfo);

        console.log('Created Airtable record:', record.id);

        // Send email notifications
        const emailResults = await sendEmailNotifications(submissionId, data, record.id);

        console.log('Email notifications completed');

        // Return success response
        return res.status(200).json({
            success: true,
            submissionId: submissionId,
            message: 'Submission received successfully',
            timestamp: new Date().toISOString(),
            emailStatus: emailResults
        });

    } catch (error) {
        console.error('Submission error:', error);

        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
}

// ============================
// Validation
// ============================

function validateSubmission(data) {
    const errors = [];

    // Filmmaker info
    if (!data.filmmaker.name || data.filmmaker.name.length < 2) {
        errors.push('Filmmaker name is required (min 2 characters)');
    }

    if (!data.filmmaker.email || !isValidEmail(data.filmmaker.email)) {
        errors.push('Valid email address is required');
    }

    // Production info
    if (!data.production.title || data.production.title.length < 3) {
        errors.push('Film title is required (min 3 characters)');
    }

    if (!data.production.logline || data.production.logline.length < 20) {
        errors.push('Logline is required (min 20 characters)');
    }

    // Authorship declaration word count
    if (data.authorship.declaration) {
        const wordCount = data.authorship.declaration.trim().split(/\s+/).length;
        if (wordCount < 150) {
            errors.push(`Authorship declaration must be at least 150 words (current: ${wordCount})`);
        }
    } else {
        errors.push('Authorship declaration is required');
    }

    // Tools
    if (!data.tools || data.tools.length === 0) {
        errors.push('At least one AI tool must be listed');
    }

    // Video URL
    if (!data.files.videoUrl || !isValidURL(data.files.videoUrl)) {
        errors.push('Valid video URL is required');
    }

    // File uploads
    if (!data.files.receipts || data.files.receipts.length === 0) {
        errors.push('At least one tool receipt is required');
    }

    return errors;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ============================
// Rate Limiting
// ============================

async function checkRateLimit(email) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const records = await base('Submissions')
            .select({
                filterByFormula: `AND({filmmaker_email} = '${email}', IS_AFTER({timestamp}, '${today.toISOString()}'))`,
                fields: ['filmmaker_email']
            })
            .firstPage();

        return records.length >= 5; // Max 5 submissions per day
    } catch (error) {
        console.error('Rate limit check error:', error);
        return false; // Fail open
    }
}

// ============================
// Submission ID Generation
// ============================

async function generateSubmissionId() {
    try {
        const records = await base('Submissions')
            .select({
                maxRecords: 1,
                sort: [{ field: 'timestamp', direction: 'desc' }],
                fields: ['submission_id']
            })
            .firstPage();

        if (records.length === 0) {
            return 'SUB-2026-0001';
        }

        const lastId = records[0].get('submission_id');
        const lastNumber = parseInt(lastId.split('-')[2]);
        const nextNumber = (lastNumber + 1).toString().padStart(4, '0');

        return `SUB-2026-${nextNumber}`;
    } catch (error) {
        console.error('ID generation error:', error);
        // Fallback to timestamp-based ID
        return `SUB-2026-${Date.now()}`;
    }
}

// ============================
// File Processing
// ============================

function processFileInfo(files) {
    // For now, just store file names and sizes as text
    // TODO: Implement proper file upload to storage (Vercel Blob, Cloudinary, etc.)
    if (!files || files.length === 0) return '';

    return files.map(file => `${file.name} (${(file.dataUrl.length / 1024 / 1024).toFixed(2)} MB)`).join(', ');
}

// ============================
// Airtable Record Creation
// ============================

async function createAirtableRecord(submissionId, data, receiptsInfo, supportingDocsInfo) {
    const record = await base('Submissions').create([
        {
            fields: {
                submission_id: submissionId,
                status: 'received',
                filmmaker_name: data.filmmaker.name,
                filmmaker_email: data.filmmaker.email,
                filmmaker_location: data.filmmaker.location,
                filmmaker_portfolio: data.filmmaker.portfolio,
                prior_works: data.filmmaker.priorWorks || '',
                first_submission: data.filmmaker.firstSubmission,
                title: data.production.title,
                runtime: data.production.runtime,
                genre: data.production.genre,
                logline: data.production.logline,
                intended_use: data.production.intendedUse,
                production_start: data.production.productionStart,
                production_end: data.production.productionEnd,
                existing_agreements: data.production.existingAgreements || '',
                tools_json: JSON.stringify(data.tools),
                authorship_declaration: data.authorship.declaration,
                likeness_confirmed: true, // Assuming checkboxes were checked to submit
                likeness_notes: data.likeness.notes || '',
                ip_confirmed: true,
                ip_notes: data.ip.notes || '',
                audio_music_source: data.audio.musicSource,
                audio_music_tool: data.audio.musicTool || '',
                audio_sound_design: data.audio.soundDesign,
                audio_voiceover: data.audio.voiceover,
                tier2_enrollment: data.tier2.enrollment,
                tier2_scenes: data.tier2.scenes || '',
                territory_preference: data.territory.preference,
                territory_restrictions: data.territory.restrictions || '',
                exclusivity_preference: data.territory.exclusivity,
                video_url: data.files.videoUrl,
                // video_password: data.files.videoPassword || '', // TODO: Add this field to Airtable
                reviewer: 'JD',
                receipts: receiptsInfo, // Store as text: "file1.pdf (2.5 MB), file2.jpg (1.2 MB)"
                supporting_docs: supportingDocsInfo // Store as text for now
            }
        }
    ]);

    return record[0];
}

// ============================
// Email Notifications
// ============================

async function sendEmailNotifications(submissionId, data, recordId) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    const targetDateStr = targetDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const emailResults = {
        filmmaker: null,
        internal: null
    };

    // Email 1: Filmmaker confirmation
    try {
        console.log(`📧 Sending filmmaker confirmation to: ${data.filmmaker.email}`);

        const filmmakerEmail = await resend.emails.send({
            from: 'SI8 <noreply@superimmersive8.com>',
            replyTo: 'jd@superimmersive8.com',
            to: data.filmmaker.email,
            subject: `SI8 Rights Verified Submission Received — ${data.production.title}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1918;">
                    <h2 style="font-family: 'Space Grotesk', Arial, sans-serif; color: #1a1918; font-size: 24px; margin-bottom: 16px;">Submission Received</h2>

                    <p>Hi ${data.filmmaker.name},</p>

                    <p>We've received your Rights Verified submission for "<strong>${data.production.title}</strong>."</p>

                    <div style="background: #F7F6EF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 20px; margin: 24px 0;">
                        <p style="margin: 0 0 8px 0;"><strong>Submission Details:</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>Submission ID: <strong>${submissionId}</strong></li>
                            <li>Submitted: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
                            <li>Target completion: <strong>${targetDateStr}</strong></li>
                        </ul>
                    </div>

                    <p><strong>What happens next:</strong></p>
                    <ol style="line-height: 1.8;">
                        <li>We'll begin our Rights Verified review within 2 business days</li>
                        <li>You'll receive an update by <strong>${targetDateStr}</strong> with one of three outcomes:
                            <ul style="margin-top: 8px;">
                                <li>✅ Approved — Chain of Title issued</li>
                                <li>⏳ Approved pending additional info</li>
                                <li>❌ Not approved with explanation</li>
                            </ul>
                        </li>
                        <li>If approved, your work will be added to SI8's catalog</li>
                    </ol>

                    <p>Questions? Reply to this email and we'll get back to you within 24 hours.</p>

                    <p style="margin-top: 32px;">Best,<br><strong>SI8 Review Team</strong></p>

                    <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 32px 0;">

                    <p style="font-size: 12px; color: #8C8A82;">
                        This is an automated confirmation. Your submission has been logged and our team will review it shortly.
                    </p>
                </div>
            `
        });

        emailResults.filmmaker = { success: true, id: filmmakerEmail.id };
        console.log(`✅ Filmmaker email sent successfully. Email ID: ${filmmakerEmail.id}`);
    } catch (error) {
        emailResults.filmmaker = { success: false, error: error.message };
        console.error('❌ Failed to send filmmaker email:', error);
        // Don't throw - try to send internal email anyway
    }

    // Email 2: SI8 internal notification
    try {
        console.log('📧 Sending internal notification to: jd@superimmersive8.com');

        const airtableRecordUrl = `https://airtable.com/${process.env.AIRTABLE_BASE_ID}/${recordId}`;

        const internalEmail = await resend.emails.send({
            from: 'SI8 <noreply@superimmersive8.com>',
            to: 'jd@superimmersive8.com',
            subject: `🎬 New Rights Verified Submission: ${data.production.title} by ${data.filmmaker.name}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1918;">
                    <h2 style="font-family: 'Space Grotesk', Arial, sans-serif; color: #1a1918; font-size: 24px; margin-bottom: 16px;">New Rights Verified Submission</h2>

                    <div style="background: #F7F6EF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 20px; margin: 24px 0;">
                        <p style="margin: 0 0 4px 0;"><strong>Submission ID:</strong> ${submissionId}</p>
                        <p style="margin: 0 0 4px 0;"><strong>Filmmaker:</strong> ${data.filmmaker.name} (${data.filmmaker.email})</p>
                        <p style="margin: 0 0 4px 0;"><strong>Title:</strong> ${data.production.title}</p>
                        <p style="margin: 0 0 4px 0;"><strong>Runtime:</strong> ${data.production.runtime}</p>
                        <p style="margin: 0 0 4px 0;"><strong>Intended use:</strong> ${data.production.intendedUse}</p>
                    </div>

                    <p><strong>Quick links:</strong></p>
                    <ul>
                        <li><a href="${airtableRecordUrl}" style="color: #C8900A;">View submission in Airtable</a></li>
                        <li><a href="${data.files.videoUrl}" style="color: #C8900A;">Watch video</a></li>
                    </ul>

                    <div style="background: white; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 16px; margin: 24px 0;">
                        <p style="margin: 0 0 8px 0;"><strong>Tools used:</strong></p>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${data.tools.map(tool => `<li>${tool.name} ${tool.version} (${tool.plan}) ✅</li>`).join('')}
                        </ul>
                    </div>

                    <p><strong>Tier 2 enrollment:</strong> ${data.tier2.enrollment}</p>
                    <p><strong>First submission:</strong> ${data.filmmaker.firstSubmission ? 'Yes' : 'No'}</p>

                    <p style="margin-top: 32px;"><strong>Next step:</strong> Begin pre-screen review (target: within 2 business days)</p>
                </div>
            `
        });

        emailResults.internal = { success: true, id: internalEmail.id };
        console.log(`✅ Internal email sent successfully. Email ID: ${internalEmail.id}`);
    } catch (error) {
        emailResults.internal = { success: false, error: error.message };
        console.error('❌ Failed to send internal email:', error);
    }

    // Log summary
    console.log('📊 Email sending summary:', JSON.stringify(emailResults, null, 2));

    // Only throw if BOTH emails failed
    if (!emailResults.filmmaker.success && !emailResults.internal.success) {
        throw new Error('Failed to send both confirmation emails');
    }

    return emailResults;
}
