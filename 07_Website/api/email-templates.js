// ============================
// Email Templates for Rights Verified Outcomes
// ============================

// Template 1: APPROVED - Work added to catalog
exports.approvedEmail = (filmmakerName, title, submissionId, chainOfTitleUrl) => ({
    subject: `✅ Approved — "${title}" added to SI8 catalog`,
    html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1918;">
            <h2 style="font-family: 'Space Grotesk', Arial, sans-serif; color: #1a1918; font-size: 24px; margin-bottom: 16px;">🎉 Your Work Has Been Approved</h2>

            <p>Hi ${filmmakerName},</p>

            <p>Great news! "<strong>${title}</strong>" has passed our Rights Verified review and has been added to the SI8 catalog.</p>

            <div style="background: rgba(200,144,10,0.08); border: 1px solid rgba(200,144,10,0.3); border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>What this means:</strong></p>
                <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.8;">
                    <li>Your work is now live in our catalog at <a href="https://www.superimmersive8.com/#catalog" style="color: #C8900A;">superimmersive8.com</a></li>
                    <li>We'll pitch it to brands and platforms looking for rights-verified AI content</li>
                    <li>You'll be notified immediately when we receive licensing inquiries</li>
                    <li>You earn 80% of all licensing fees we facilitate</li>
                </ul>
            </div>

            <p><strong>Your Chain of Title documentation is attached.</strong> This is the legal package we provide to buyers. Keep it for your records.</p>

            <div style="background: #F7F6EF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>Next steps:</strong></p>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>View your work in our catalog: <a href="https://www.superimmersive8.com/#catalog" style="color: #C8900A;">Browse catalog</a></li>
                    <li>We'll reach out when we have licensing opportunities</li>
                    <li>You can submit more work anytime: <a href="https://www.superimmersive8.com/submit" style="color: #C8900A;">Submit another film</a></li>
                </ol>
            </div>

            <p>Questions about licensing, representation, or your Chain of Title? Just reply to this email.</p>

            <p style="margin-top: 32px;">Congratulations and thanks for trusting SI8 with your work!<br><br>
            <strong>JD</strong><br>
            SI8 Rights Verified Team</p>

            <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 32px 0;">

            <p style="font-size: 12px; color: #8C8A82;">
                <strong>Submission ID:</strong> ${submissionId}<br>
                <strong>Status:</strong> Approved — Added to catalog<br>
                <strong>Review completed:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>
    `
});

// Template 2: CONDITIONAL APPROVAL - Need additional info
exports.conditionalApprovalEmail = (filmmakerName, title, submissionId, requestedInfo) => ({
    subject: `⏳ Almost there — "${title}" needs additional info`,
    html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1918;">
            <h2 style="font-family: 'Space Grotesk', Arial, sans-serif; color: #1a1918; font-size: 24px; margin-bottom: 16px;">Almost There — Additional Info Needed</h2>

            <p>Hi ${filmmakerName},</p>

            <p>We've reviewed "<strong>${title}</strong>" and it's very close to approval! We just need a bit more information to complete our Rights Verified review.</p>

            <div style="background: rgba(200,144,10,0.08); border: 1px solid rgba(200,144,10,0.3); border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0;"><strong>What we need:</strong></p>
                <div style="white-space: pre-wrap; line-height: 1.8;">${requestedInfo}</div>
            </div>

            <p><strong>You have 14 days to provide this information.</strong> Once we receive it, we'll complete the review within 2 business days.</p>

            <div style="background: #F7F6EF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0;"><strong>How to respond:</strong></p>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Reply to this email with the requested information</li>
                    <li>Attach any files or documentation we need</li>
                    <li>We'll review and get back to you within 2 business days</li>
                </ol>
            </div>

            <p>This is usually a quick fix — most conditional approvals are resolved within a few days.</p>

            <p>Questions? Just reply to this email.</p>

            <p style="margin-top: 32px;">Thanks,<br>
            <strong>JD</strong><br>
            SI8 Rights Verified Team</p>

            <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 32px 0;">

            <p style="font-size: 12px; color: #8C8A82;">
                <strong>Submission ID:</strong> ${submissionId}<br>
                <strong>Status:</strong> Conditional approval — Additional info required<br>
                <strong>Deadline:</strong> ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
                <strong>Review completed:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>
    `
});

// Template 3: REJECTED - Does not meet criteria
exports.rejectedEmail = (filmmakerName, title, submissionId, rejectionReason, canResubmit) => ({
    subject: `Update on "${title}" submission`,
    html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1918;">
            <h2 style="font-family: 'Space Grotesk', Arial, sans-serif; color: #1a1918; font-size: 24px; margin-bottom: 16px;">Rights Verified Review — Update</h2>

            <p>Hi ${filmmakerName},</p>

            <p>Thank you for submitting "<strong>${title}</strong>" for Rights Verified review.</p>

            <p>After careful review against our vetting criteria, we're unable to add this work to our catalog at this time.</p>

            <div style="background: #F7F6EF; border: 1px solid rgba(0,0,0,0.08); border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px 0;"><strong>Why this didn't pass review:</strong></p>
                <div style="white-space: pre-wrap; line-height: 1.8;">${rejectionReason}</div>
            </div>

            ${canResubmit ? `
                <div style="background: rgba(200,144,10,0.08); border: 1px solid rgba(200,144,10,0.3); border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Can you resubmit?</strong></p>
                    <p style="margin: 0; line-height: 1.8;">Yes! If you can address the issue noted above, you're welcome to resubmit. We'd love to work with you if the updated version meets our criteria.</p>
                </div>
            ` : `
                <p>Unfortunately, this work cannot be resubmitted in its current form. However, we'd love to see other projects from you that might be a better fit for our catalog.</p>
            `}

            <p>We know this isn't the outcome you hoped for. Our review criteria are strict because buyers (brands and platforms) require legal defensibility — we can only represent work that passes all 7 vetting categories.</p>

            <p>If you have questions about the decision or want clarification on our criteria, please reply to this email. We're happy to explain further.</p>

            <p style="margin-top: 32px;">Thanks for considering SI8, and we hope to work with you on future projects.<br><br>
            <strong>JD</strong><br>
            SI8 Rights Verified Team</p>

            <hr style="border: none; border-top: 1px solid rgba(0,0,0,0.08); margin: 32px 0;">

            <p style="font-size: 12px; color: #8C8A82;">
                <strong>Submission ID:</strong> ${submissionId}<br>
                <strong>Status:</strong> Not approved<br>
                <strong>Review completed:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
        </div>
    `
});
