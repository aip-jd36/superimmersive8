# SI8 Product Discovery Pipeline

**Purpose:** Track leads who gave valuable product insights — workflow descriptions, pain
quantification, product questions, competitive intel. These are NOT sales leads. The goal
is discovery calls to validate PMF, surface edge cases, and identify product gaps.

**Source:** `03_Sales/DISCOVERY-PERFORMANCE-LOG.md` → Discovery Signal Checklist → manual review.
A lead can appear in BOTH this pipeline and `03_Sales/CRM.md` if they are also a sales prospect.

**Last updated:** 2026-05-29

---

## Stage Definitions

| Stage | What it means | Entry criteria |
|-------|---------------|----------------|
| **Signal** | Reply contained real insight — added here pending outreach decision | Flagged by `is_product_feedback()`, confirmed by manual review |
| **Outreach Sent** | JD replied asking to learn more / get on a discovery call | Message sent specifically for product discovery |
| **Call Booked** | Date and time confirmed, calendar invite sent | Calendar event created |
| **Call Taken** | Call happened, notes captured | Post-call |
| **Insight Documented** | Key learnings written up in Insights Archive below | Write-up filed |

**Advisor/Beta** (ongoing): Leads invited into a recurring feedback loop — platform beta, advisory role, or ongoing check-ins.

---

<!-- discovery-pipeline:start -->

## Signal (220)

*Leads flagged from discovery report, pending outreach decision.*

| Lead | Title | Company | Geo | Sales Class | Campaign | Key insight excerpt | Added |
|------|-------|---------|-----|-------------|----------|---------------------|-------|
| Mike Harris | Product Manager | Seenit | London/UK | [WARM] | — | "Yes I will be open to finding out more and a short call." — explicit call request | 2026-05-26 |
| Gabriel Preston | Head of Engagement & Directors Rep | Imagine This Creative Studio | London/UK | [MINIMAL] | — | "Client has approved platform list for indemnity… we share prompt sheets and workflow docs… increased focus on talent usage and likeness rights" | 2026-05-26 |
| Ankita Biswas | Art Director | HTCreaTec | UAE/Dubai | [WARM] | — | "Yess! They do at times!… I'd love to know more about it and also talk about it over a chat! Ping me when you're available to discuss!" | 2026-05-26 |
| Tunç Topçuoglu | Co-Founder + Hybrid Film Director | HOOD Studio | Netherlands | [WARM] | — | "I checked your product and platform its very interesting. I would love to hear more about it." — proactively visited site | 2026-05-26 |
| Steve Bannerman | Head of Post-production Intl Originals APAC + Head of Intl VFX | Prime Video & Amazon MGM Studios | London/UK | [MINIMAL] | — | "In the feature film space, provenance of the video is HUGELY important. You will indeed see it coming up more and more…" | 2026-05-26 |
| Rheea Aranha | Creative Director | Vincent Studios | London/UK | [WARM] | — | Thanks, We will be in touch at the time this is required. A sample of Chain of t… | 2026-05-23 |
| Nikolay Kolev | VR Designer | XR Future LTD | London/UK | [WARM] | — | Hi Ivy, Yes, more often now, especially with enterprise and regulated brands. Le… | 2026-05-23 |
| Graham Vincent | Creative Director | grigio:london | London/UK | [WARM] | — | Yes, of course. G01:31 am Mon May 04 2026 Hi Graham, good to hear — and that's w… | 2026-05-23 |
| Tahreem Khan | Creative Technologist / AI | Xperia Labs | London/UK | [WARM] | — | Generally not02:24 am But u do wanna look into potential copyright issues02:24 a… | 2026-05-23 |
| Theodora S | Creative Technologist & Digital Director (Freelancer) | null | London/UK | [WARM] | — | Tue May 05 2026 Hi Ivy, Tell me more about what you're looking for!07:35 pm | 2026-05-23 |
| Ibrahim Badi | Managing Director | IKM Marketing | London/UK | [WARM] | — | Hi Ivy, Appreciate the connection. Yes especially in regulated sectors. I docume… | 2026-05-23 |
| Ziyan Zhao | Creative Technologist | WPP | London/UK | [WARM] | — | Hi Ivy，not that I'm aware of. The LLMs we used will green lit by our legal team … | 2026-05-23 |
| Ivan Petruzzelli | Design Executive & AI Strategist | VP at State Street | 3 Decades Exp | $2.5M+ | State Street Investment Management | London/UK | [WARM] | — | Hi, Ivy03:55 pm Yes you need to tell you legal team that the video has been gene… | 2026-05-23 |
| Louisa Osei | Creative Director | VERVE | London/UK | [WARM] | — | Mon May 11 2026 Hi Ivy, Great question. No legal teams involved the teams I work… | 2026-05-23 |
| Kelvin Obimba | UX Designer | Betterworks | London/UK | [WARM] | — | Hi Ivy 👋 I don’t create fully AI-generated videos for campaigns. I mainly integr… | 2026-05-23 |
| Bo-Re Zhang | AI Designer | Prime Intelligence Production | London/UK | [WARM] | — | Hi Ivy, Thanks for reaching out! I actually haven't encountered this yet. Someti… | 2026-05-23 |
| Gary Martin | null | Retoucher/Creative Artworker | London/UK | [WARM] | — | Hi Ivy, Good question – I've not had any legal teams explicitly ask for document… | 2026-05-23 |
| James Addison | null | forpeople | London/UK | [WARM] | — | Hi Ivy, Great to be connected. In truth, we haven't gotten that far down the pro… | 2026-05-23 |
| Kevin Delaroche | Conceptual Designer / Digital Designer | Bally’s Corporation | London/UK | [WARM] | — | Hi Ivy, Good question. From what I’ve seen, legal teams don’t always ask for a f… | 2026-05-23 |
| Oliyah Joseph | AI Creative Director | Visual Vibe | London/UK | [WARM] | — | Hi Ivy — great question, and yes, I’m definitely seeing this come up more this y… | 2026-05-23 |
| Hossein Jafari | Managing Director | Wowspot Ltd. | London/UK | [WARM] | — | 👍06:37 am Hi Vanessa, Lovely to meet you! You’re right about the documentation; … | 2026-05-23 |
| Jay Pirabakaran | Founder & AI Creative Director | JAYPRINTS Studio | London/UK | [WARM] | — | Hi Ivy, yes, that’s definitely starting to come up more now. Usually not every c… | 2026-05-23 |
| Eudonni Moricom | Project Manager | Aspargo Laboratories, Inc. | London/UK | [WARM] | — | Hi Ivy, that's a good question. I haven't had any questions for video or for ima… | 2026-05-23 |
| Dylan Guo | Creative Technologist | Independent Projects | London/UK | [WARM] | — | Hi Ivy, good question. I haven‘t run into that situation personally yet, but if … | 2026-05-23 |
| Julia N'Diamoi | Creative technologist Level 2 | T&P | London/UK | [WARM] | — | Hey Ivy,from my experience, the documentation requirements usually fall into two… | 2026-05-23 |
| Leimi Zhou | Digital Marketing Strategist & Video Artist | WOMBO | London/UK | [WARM] | — | Hey Vanessa, I’ve never been asked for documentation on my process. Why do you a… | 2026-05-23 |
| Amr Hamad | Director, Retail Media – EU & APAC | Stackline | London/UK | [WARM] | — | Hey Vanessa, honestly the main criteria we usually have is that it follows the c… | 2026-05-23 |
| Hasan Sarwar | Founder & Chief Strategist | Numu Consulting | London/UK | [WARM] | — | Tue Mar 24 2026 Yes go ahead Vanessa, I'd love to see the Example RIghts Package… | 2026-05-23 |
| Nourhan Mostafa | Creative Director – AI Content | Ai Studio | Other | [WARM] | — | Hi Vanessa, Great question actually. I usually try to involve the legal side ear… | 2026-05-23 |
| Chee Guan Yue | Creative Director | Moove Media | Other | [WARM] | — | Hi Lilly, Thanks for reaching out. I’m not entirely clear about the wall that pr… | 2026-05-23 |
| Marc Danielle De Guzman | Creative Head | UnaFinancial | Other | [WARM] | — | Thanks for reaching out—this is definitely something I’ve started to notice more… | 2026-05-23 |
| Chitra J | Creative Head | GrapheneAI | Other | [WARM] | — | Hi! Thanks for reaching out — that’s actually a very relevant point right now. Y… | 2026-05-23 |
| Natalia Zablotska | Directors Assistant | Agro-Bondarivka Ukraine | Other | [WARM] | — | Hi, Yes, I'm definitely seeing more of this lately. Legal teams are increasingly… | 2026-05-23 |
| Stephen Reid | Founder and Creative Director | NUsign DEsign | Other | [WARM] | — | Hi Ivy, thanks for reaching out. I’m still relatively early in the client side o… | 2026-05-23 |
| Steve Cooper | Boss | Spitting Lizard Design | Other | [WARM] | — | Legal teams? I don't deal with companies the size that will have legal teams. | 2026-05-23 |
| Sophie Purewal | Senior UI Designer | Aegon UK | Other | [WARM] | — | Hi Ivy, so I design apps not Ai generated video content. This is a good question… | 2026-05-23 |
| Amr Tahtawi | Dubai | Arizona State University | Other | [WARM] | — | Short Answer, Yup 20% of y clients asks for that and aI make them pay extra fees… | 2026-05-23 |
| Saira Macleod | AI Creative Consultant Lead | Magnific (formerly Freepik) | Other | [WARM] | — | Hi Ivy, yes it is common place to supply all the prompt documentation. thanks fo… | 2026-05-23 |
| Eric Vandruff | Creative Director & Multimedia Specialist | VanDruff Productions Inc. | Other | [WARM] | — | Hi Vanessa, It depends on the client and how the content is being used. It would… | 2026-05-23 |
| Luke Brady | Founder | Sublime Animations Ltd | Other | [WARM] | — | Hi Luke, can you confirm if the email is: sublimanimations333@gmail.com ? Becaus… | 2026-05-23 |
| Beatriz Politi | Marketing and Attraction Recruitment Consultant | Brighton & Hove City Council | Other | [WARM] | — | Hi Ivy! I actually don’t deliver AI generated videos so I wouldn’t know, but fro… | 2026-05-23 |
| Iryna Kostyrko | Creative Product Designer | KUMA | Story-Driven Children’s IP | Other | [WARM] | — | Hi Ivy, thanks for your question. I haven’t encountered this yet, but it’s reall… | 2026-05-23 |
| Adam Ridges | OneAdvanced | OneAdvanced | Other | [WARM] | — | I wouldn't say so much about legal teams, although using ai can definitely fall … | 2026-05-23 |
| Loewe Chung Nin Lee | AI Video & Digital Content Producer | Media & Communications | null | Other | [WARM] | — | Hi Ivy, Great question — I’ve started seeing this come up more recently as well,… | 2026-05-23 |
| Ruth Teasdale | Director & Client Lead | Motion World Ltd | Other | [WARM] | — | Hi Ivy, In some of our projects, we do use AI tools, but in many cases these are… | 2026-05-23 |
| Ramez Tabshi | null | null | UAE/Dubai | [WARM] | — | Hi Lilly, I'd definitely be glad to jump on a call with you and JD to see the pr… | 2026-05-23 |
| Artemio Mani | Digital Designer | Freelance | Self-Employed | UAE/Dubai | [WARM] | — | Hi,Lilly To be honest, I haven’t faced it before I can’t really tell about it, b… | 2026-05-23 |
| Nikan Nazari نیکان نظری | Senior Digital Marketing, Content Strategist and Branding Consultant | Freelance | Self-Employed | UAE/Dubai | [WARM] | — | Hi Lily Hsiao When the company signs the contract, we as a team have cooperation… | 2026-05-23 |
| Mikhail Gulkov | Сreative Director | Volna vision | UAE/Dubai | [WARM] | — | That is a great question. In my experience, they actually don't request detailed… | 2026-05-23 |
| Jonathan Hirasawa Ashton | null | KROHNE | UAE/Dubai | [WARM] | — | Hey there great question. I’m not seeing it but it sounds likely as copyright on… | 2026-05-23 |
| Junaid Ali Khan | null | Creative Wing | UAE/Dubai | [WARM] | — | Hey Lilly10:22 am How you doing?02:32 pm Yeah ,legal teams sometimes ask how it … | 2026-05-23 |
| Dipesh Makwana | Team Lead GTM - AI MaaS | Qwen | UAE/Dubai | [WARM] | — | Hmmm good question, currently we have not see this. But that’s not to say it doe… | 2026-05-23 |
| Gareth Mankoo | null | Creative Director | UAE/Dubai | [WARM] | — | Hey Lilly. I have only been asked once. But the client's legal team resolved it … | 2026-05-23 |
| Ayman Hussein | Senior Video Editor | AI-Driven Motion & Visual Content | null | UAE/Dubai | [WARM] | — | Hello Lilly, Thanks for the question, From my experience, for smaller campaigns … | 2026-05-23 |
| Manoj Joseph | null | SuperQ Quantum | UAE/Dubai | [WARM] | — | Hi Lilly, Can you share more on the "We Build your AI Sales Stack" to mjoseph@su… | 2026-05-23 |
| Sultan Alsuwaidi | null | Video tube | UAE/Dubai | [WARM] | — | Yes — and it’s becoming standard now. From my experience in video production and… | 2026-05-23 |
| Shahin Sha | Creative Director | Rafaz Properties | UAE/Dubai | [WARM] | — | Hi Lilly, Good question. In my experience, it’s starting to come up more now tha… | 2026-05-23 |
| Henna Mohiyuddeen | Social Media Manager | Zamania | UAE/Dubai | [WARM] | — | Hey Lilly, Thanks for your message! They do not ask for legal teams or documenta… | 2026-05-23 |
| Anas Bakal | null | Monoud Trading Fz-LIC | UAE/Dubai | [WARM] | — | Hi Lilly, Yes, I’ve definitely noticed that coming up more often this year. Lega… | 2026-05-23 |
| Florent Delavous | CEO & Founder | Xtendency™ AI Video Production Consulting House | UAE/Dubai | [WARM] | — | Hello Lilly, appreciate the connect. I'm already working with my legal team for … | 2026-05-23 |
| Stephane Jacob | Dubai | Atlantic Venture Group | UAE/Dubai | [WARM] | — | Yes, but i have a different approach to this. I usually don't go above 30% of AI… | 2026-05-23 |
| Asif N | Graphic Designer and VIDEO EDITOR | Fundfloat Academy | UAE/Dubai | [WARM] | — | Hi Lilly, that’s a great observation. Yes, I’m seeing more legal teams requestin… | 2026-05-23 |
| Debjani Mukherjee | Visual Arts Teacher | GEMS World Academy - Dubai | UAE/Dubai | [WARM] | — | Hi Lilly, Yes, increasingly so. Over the past year, I’ve noticed that legal and … | 2026-05-23 |
| Anuj Gunasena | Photographer at bloomingdale's | Al Tayer Insignia | UAE/Dubai | [WARM] | — | Hi Lilly, At the moment I’m mainly creating AI-generated content for e-commerce … | 2026-05-23 |
| Ahmed Samy Amin | Creative Producer | GTCFX | UAE/Dubai | [WARM] | — | Hi Lilly, Great question — and honestly, it's becoming one of the more interesti… | 2026-05-23 |
| Mohanaselvan Jeyapalan | SVP - PMO | Expo City Dubai | UAE/Dubai | [WARM] | — | Hello Lilly - Hope all is well. Very interesting question. As someone who is ver… | 2026-05-23 |
| Spencer Stander | Producer | STANDER PRODUCTIONS INC | USA | [WARM] | — | Yes, definitely seeing it come up more this year, especially with larger brands … | 2026-05-23 |
| Jean Delaunay | Creative Director / Designer | Mathematic Studio | USA | [WARM] | — | So usually... We have an initial conversation about the tools we intend to use f… | 2026-05-23 |
| Tibet Ellor | Brand Specialist | Creative Content Strategist | Ace Bark Ads | USA | [WARM] | — | Hey Vanessa, great question. We use "Human-in-the-loop" (HITL) systems to ensure… | 2026-05-23 |
| Justin Brown | Founder — Ether Labs LLC | Ether Labs LLC | USA | [WARM] | — | Hi Vanessa, Good question. Although I've created 30K+ video clips over the past … | 2026-05-23 |
| Jamie Grefe | AI Creative Consultant | Xenoslit AI | USA | [WARM] | — | Hi Vanessa, I'm full-time contracted w/ a company right now that has a legal tea… | 2026-05-23 |
| Duc-Minh Nguyen | Gen AI Artist @ Meta | TEKsystems | USA | [WARM] | — | Hi! Hope you are doing well. Yes when we deliver ai video to clients, legal team… | 2026-05-23 |
| Justin Lufair Brown | Creative Producer, AI Video Production | Amazon | USA | [WARM] | — | Hi Vanessa! Honest answer: it varies a lot by client tier. For Fortune 500 brand… | 2026-05-23 |
| Josh Guillaume | Creative Director | Blue Dog VFX | USA | [WARM] | — | Hi Vanessa, I haven't yet had a project where it's been explicitly contracted, b… | 2026-05-23 |
| Igor Gutierrez | Multimodal Artist | electrozooer | USA | [WARM] | — | Definitely they do. Many agencies are now providing ai manifestos, showcasing al… | 2026-05-23 |
| Graeme Carr | VFX & AI Artist (Commercials, Brand Films) | OBSIDIAN | Netherlands | [WARM] | — | Hey. Not directly, but we do keep record of what was uploaded where and what ref… | 2026-05-23 |
| Lina De Groot | Advisor / Artist Collective Partnership | Stealth AI Startup | Netherlands | [WARM] | — | Hi Vanessa, Good question - I’ve had it a few times, mostly from larger brands. … | 2026-05-23 |
| Shahrukh Kazmi | Freelance Graphic Designer | Ai design Specialist | null | Netherlands | [WARM] | — | Hi Vanessa, Not everyone, but yeah, some legal teams are starting to ask. I usua… | 2026-05-23 |
| Kees-Jan Husselman | Director and editor diverse film assignments | null | Netherlands | [WARM] | — | Hi Vanessa, Currently I am working on a video project with AI generated avatars … | 2026-05-23 |
| Ilias Chatzatoglou | Senior Cloud & Software Engineer (Freelance) | Freelance | Netherlands | [WARM] | — | Hi Vanessa, Thank you for reaching out. I don’t deliver AI-generated videos, so … | 2026-05-23 |
| Oscar Julius Marmelstein | Founder | The Shed | Editing Company | Netherlands | [WARM] | — | Hi Vanessa, Thanks for your quick question. The legal teams I worked with don't … | 2026-05-23 |
| Jasper Klimbie | Conversational AI Consultant | CDI Services | Netherlands | [WARM] | — | Hi Vanessa, honestly not really in my realm, I am more involved in Conversationa… | 2026-05-23 |
| Alexander Kraemer | Experience Architect / Digital Creative | AK / 83 | Netherlands | [WARM] | — | Hi Vanessa, Good question — yes, it’s coming up more frequently. Documentation r… | 2026-05-23 |
| Dagny Rozniak | Gen Ai Creative Director | Pencil | Netherlands | [WARM] | — | Hi Vanessa, I am not sure. Clients always ask about process but not sure if lega… | 2026-05-23 |
| Hugo Faustino | Canon EMEA | DP&S Digital Printing Solutions | ESPM | Canon EMEA | Netherlands | [WARM] | — | Hi Vanessa, Thank you for your question, for enterprise level both legal and com… | 2026-05-23 |
| Tim Deussen | Chairperson | XRBB - Extended Reality Berlin-Brandenburg e.V. | Germany | [WARM] | — | Hi Yu, yes you need compliance with the Ai Act and data protection act. To advis… | 2026-05-23 |
| Ehsan Aliabadi | Multimedia Producer & AV Systems Engineer | Loudestudio | Germany | [WARM] | — | Hi, thanks for reaching out. In my experience, it depends on the client and the … | 2026-05-23 |
| Shriya Singh | Product Manager | passify | Germany | [WARM] | — | Thu May 14 2026 Hi Yu, thankfully that sort of case hasn't come up in my work ye… | 2026-05-23 |
| Joachim Klatt | MD, VP (Head of Global Marketing/AI & Sales - coordinator/consultant/manager/167+ countries) | one.GLOBAL-VISION.world Services Network | Germany | [WARM] | — | Not yet happened on our side. We’ve had a few clients ask generally about rights… | 2026-05-23 |
| Irene Mogollón | Creative Director | The DJ Cookbook | Germany | [WARM] | — | Hi, YU-CHIEH05:15 am No, at the moment no one from the Legal team has asked for … | 2026-05-23 |
| Seb Winter | Head of Canyon Studios | Canyon | Germany | [WARM] | — | Fri May 08 2026 If we use AI, even only partial, it has to be cleared and approv… | 2026-05-23 |
| Ulrike Kerber | AI Design & Research, Trainings, Motion,- Brand Design, Experimental AI art | Viva Design Inc. | Germany | [WARM] | — | yes, legal teams are asking with increasing frequency, and yes, you'd need to tr… | 2026-05-23 |
| Mikhail Conrad Roberto | Creative Director | PropertyLimBrothers | Singapore | [WARM] | — | Hi Ivy, I haven’t encountered legal teams asking for processes, we do however en… | 2026-05-23 |
| Shivalii Maheshwari Somani | Senior Creative Designer | The Digital Banker | Singapore | [WARM] | — | Hi Yu Chieh In my experience so far, no. I haven’t had clients ask for formal do… | 2026-05-23 |
| William Tan | Apprentice | Tareo Digital Advisory | Singapore | [WARM] | — | Hi Vanessa, Good afternoon to you in 🇹🇼 Taiwan. Too many individuals have floode… | 2026-05-23 |
| David Tamayo | Creative AI Director | Prose on Pixels | France/Paris | [WARM] | — | Hey we are a big network with Legal team, dedicated to AI. Laws in the US are re… | 2026-05-23 |
| Hugo Barbera | AI Director & Fortune 500 AI trainings | Advertising & Fashion | HumAIn | France/Paris | [WARM] | — | Hello06:29 pm So we have all terms and conditions from legal team in advance. Th… | 2026-05-23 |
| Billy Boman | Founder | Billy Boman AI Productions | Sweden/Stockholm | [WARM] | — | Hey, No not documentation around every prompt as the liability is on us as the p… | 2026-05-23 |
| Nick Jones | DIRECTOR - VP | null | London/UK | [MINIMAL] | — | "I have absolutely no idea what you are talking about, who you are, or what you're trying to sell me." | 2026-05-29 |
| Piotr Nierobisz | Creative Director & Founder | Munchingsquare | London/UK | [MINIMAL] | — | "I would not pitch / work on AI campaign without clearing this out with client legal department as it's wasted effort" | 2026-05-29 |
| Vijendra Kunwar Mmc | Founder | Fitter Circle | London/UK | [NAF] | — | "We don't recommend any AI videos so this would not be relevant for us." | 2026-05-29 |
| Fatima Isse | Creative Director | River Lake Studios | London/UK | [PASS] | — | "I don't currently work with Al-generated video content, so it hasn't come up in my work directly." | 2026-05-29 |
| Margarita Repina | Founder and Creative Director | Atelier Catalyst | London/UK | [MINIMAL] | — | "it's my basic rule to have a contract always 😊" | 2026-05-29 |
| Samuel Levesley-Turner | Creative Director | Point8 | London/UK | [NAF] | — | "We don't produce ai content… at all. So this is not a problem we run into whatsoever and never will." | 2026-05-29 |
| Helen Niland | Creative Director | Made In England Creative | London/UK | [PASS] | — | "Not at the moment but I'll bear you in mind. All the best with it." | 2026-05-29 |
| Volodymyr Dovbnia | Creative Director & Co-Founder | Mister Pixel Studio | London/UK | [MINIMAL] | — | "We usually obtain copyrights under a contract with the client… your service is interesting. I'll keep it in mind." | 2026-05-29 |
| Fábio Pinho | Diretor de criação | null | London/UK | [MINIMAL] | — | "No, we don't need any documentation. In some cases you just link the video in one option" | 2026-05-29 |
| Neil Alphonso | Studio Creative Director | Splash Damage | London/UK | [MINIMAL] | — | "this isn't relevant to me, at the moment anyway. I've long been focused on software more than video" | 2026-05-29 |
| Federica Di Mitri | Business Development Manager | Fashion Academics | London/UK | [MINIMAL] | — | "yes I had the same issue, but only in Europe. AI-generated video and visuals must be identifiable and properly labeled." | 2026-05-29 |
| Kelly Hogan | Founder | ELITE STORI LND | London/UK | [MINIMAL] | — | "It can pop up however you always deliver the terms and conditions etc that outline exactly what you're delivering" | 2026-05-29 |
| Marc Winklhofer | Creative Technology Director | Composition X Limited | London/UK | [MINIMAL] | — | "It depends on the client, however due to NDAs I'm not at liberty to go into detail here, sorry." | 2026-05-29 |
| Maylene Seah | Brand strategist, mentor, speaker, creative director | studio NOOR ANISA | London/UK | [PASS] | — | "Thank you Ivy and no it's not relevant to me at this point." | 2026-05-29 |
| Emma De La Fosse | Creative Consultant | The Effectiveness Partnership | London/UK | [NAF] | — | "I don't use Ai generated video for anything outside an organisation Ivy. We use it to help clients understand concepts." | 2026-05-29 |
| Kosmo Crocco | London Area | Satellite-Five | London/UK | [MINIMAL] | — | "I have yet to work at that level of approval… companies' legal dept being quite strict about models that have been used" | 2026-05-29 |
| Tunc Akyuz | Production Director | Big Media & Technology | London/UK | [PASS] | — | "It hasn't been asked yet, but a contract is being signed stating that I am responsible for the IP of all content" | 2026-05-29 |
| Uli Redkina | Creative Ai Producer | null | London/UK | [MINIMAL] | — | "We usually make a contract that grants me full rights to the images/videos" | 2026-05-29 |
| Alena Stepanova | Manager Content Intelligence & Gen AI | Philip Morris International | London/UK | [MINIMAL] | — | "I work on the client side, so I'm not involved in the agency-client approval loops. It's an interesting space though" | 2026-05-29 |
| Jenny Springett | Development Executive | Electric Violet TV | London/UK | [MINIMAL] | — | "Yes absolutely. It's required to broadcast anywhere in the EU so smart to be compliant even outside." | 2026-05-29 |
| Ricardo Barchan | Beauty and Jewellery Retoucher | Joolz Jewellery | London/UK | [MINIMAL] | — | "As of recent, yes or it is worded in the contracts so everything is above board and clear." | 2026-05-29 |
| Nuray Dal Ulualan | Co-Founder & COO | WinIQ AI | London/UK | [MINIMAL] | — | Sent automated sales pitch in reply — no discovery signal but shows segment awareness | 2026-05-29 |
| Steve Cholerton | Owner | Sentient Pictures Ltd | London/UK | [MINIMAL] | — | "only one has asked for metadata to be available if necessary" | 2026-05-29 |
| Kd Pascall | Creative Director | Bluvision studios | London/UK | [MINIMAL] | — | "Of recent yes. before it was never an issue. lol. i think maybe because its becoming more widely used now." | 2026-05-29 |
| Ali Thompson | Director | RARE 80 | London/UK | [PASS] | — | "not relevant to my needs at the moment but good to be connected. All the best" | 2026-05-29 |
| Iona Milne | Partnerships Manager | Reg&Partners | London/UK | [MINIMAL] | — | "This isn't relevant for me, but thank you" | 2026-05-29 |
| David Aston | Social Media Coordinator | CLUBWORLD TRAVEL | London/UK | [MINIMAL] | — | "We don't creat AI videos for clients, we use AR development software" | 2026-05-29 |
| Fahad A | Fractional Sales Director | Be Guided Agency | London/UK | [MINIMAL] | — | "It's something I'll certainly keep in mind, esp when we expand out offering." | 2026-05-29 |
| James Byrne | Sustainability reports, comms and PR expert | BeyondWords | London/UK | [WARM] | — | "Yes that would be great thanks" — accepted connection after Lilly's outreach; new to AI video space | 2026-05-29 |
| Lindsay Fenn | Fractional Growth & Retention Partner | Roots Marketing Co UK | London/UK | [NAF] | — | "I'm not currently creating any AI content for my clients. It may be something I do in the future" | 2026-05-29 |
| Emmanuel Stralka | Co-Founder — International Growth & Market Expansion Platform | Think Global Solutions | London/UK | [MINIMAL] | — | "We will keep you in mind when it comes to video-based assets as your ai prolly provide speed to market advantages." | 2026-05-29 |
| Jp Sing | Head of Demand Marketing | Universal Music Group | London/UK | [MINIMAL] | — | "we have an in-house team who are responsible for this… I will have to regretfully decline for further conversations." | 2026-05-29 |
| Lev Myskin | Content Strategy Consultant | Fame | Other | [MINIMAL] | — | "I abhor AI videos, campaigns, and anything that takes employment away from highly trained real people." | 2026-05-29 |
| Salem Al-Kuwari | Founder & Managing Director | SAM Strategic Access Ltd | Other | [MINIMAL] | — | "It is a relevant area, especially as questions around IP, documentation, and commercial use in AI content become more important." | 2026-05-29 |
| Cove Overley Emba | Chief Explosive Agent 000 | Toy Exploder | Other | [NAF] | — | "At this moment there are no plans to incorporate AI Video." | 2026-05-29 |
| Owen Bryant | Creative Director | Partners4Access | Other | [MINIMAL] | — | "I'm not creating videos at the moment, but as we know, things change and change quickly." | 2026-05-29 |
| Mitch Turnbull | Senior Research Associate | University of Bristol | Other | [NAF] | — | "I've not produced AI generated image content for clients - I would also make sure that I generate an AI disclosure document if I did." | 2026-05-29 |
| Giulia Willcox | Professor assistente | Instituto de Tecnologia e Sociedade (ITS Rio) | Other | [MINIMAL] | — | "I don't think I get your question. What kind of documentation is required for AI video production?" | 2026-05-29 |
| Daniel Kwintner | Branch Manager | ShowTex Asia | Other | [MINIMAL] | — | "I don't deal with Ai for Video production for now. Everything is still done from scratch." | 2026-05-29 |
| Klaus Borges | Associate Creative Director | KBL STORES | Other | [MINIMAL] | — | "I have not seen this question yet; however, I pay for licences. It should be fine. Any advice?" | 2026-05-29 |
| Brian Cox | Senior Director of Forward Deployed Engineering | Inworld AI | Other | [WARM] | — | "no, there are no legal teams asking any questions." — Inworld AI (AI content company) notable for having no legal review process | 2026-05-29 |
| Tom Furse | Artist and Creative Machine Learning Specialist | null | Other | [PASS] | — | "Honestly that hasn't come up much. I sit a bit more on the artist side of the spectrum and so my clients are often a bit less nervous." | 2026-05-29 |
| Karina L. | Founder & Strategist | KL Marketing Solutions | Other | [MINIMAL] | — | Has AI disclosure language baked into contracts: "Content produced under this agreement may be created using a combination of AI tools and human input." | 2026-05-29 |
| Andrew Fox | CEO & Founder | Foxy Digital | Other | [MINIMAL] | — | "Not now but could be useful in the future. I'll add you to my list of production folks so when the need arises, we can touch base." | 2026-05-29 |
| Nupur Vartak | Senior Art Director | Famous Innovations | Other | [MINIMAL] | — | "they can ask that as content that is created with AI has authorship issues, so to avoid trouble in future, they might ask for documentation" | 2026-05-29 |
| Ted Hemberger | Post Producer / Lead Video Editor | micro1 | Other | [MINIMAL] | — | "it honestly depends on the company… if it is just a one off for one client… you usually need to have some type of proof" | 2026-05-29 |
| Anastasia Khanova | Creative Producer | Novakid Inc | Other | [MINIMAL] | — | "It depends on the platform." | 2026-05-29 |
| Albert Centell | Founder & AI Creative Director | Revolmind | Other | [MINIMAL] | — | "I'll keep Super Immersive in mind and reach out if something relevant comes up on my side." | 2026-05-29 |
| Harry Murugan | Creative Director | CLLOUD.AI | Other | [MINIMAL] | — | "I dont actually use AI within my work, and if i do i declare it." | 2026-05-29 |
| Ed Job | Post Producer | Gramercy Park Studios | Other | [MINIMAL] | — | "this question will come up more and more as AI evolves… Is the actor entitled to more money as we are using their body…" | 2026-05-29 |
| Anthony Ferreri | Early Adopter (First 500 Member) | Anthony Ferreri | Other | [MINIMAL] | — | "I don't deal with AI-generated video as a deliverable for my clients." | 2026-05-29 |
| Ashutosh Labroo | Managing Partner | successioniq | Other | [PASS] | — | "Not relevant for me and my my firm. I wish you good luck Lilly 🙏" | 2026-05-29 |
| Kasra Mirzarezaie | Creative Director \| AI Video | Case Connect LLC | Other | [MINIMAL] | — | "in CA we have strict standards that need to be followed… Outside CA we dont need any approval." | 2026-05-29 |
| Elliott Prompts | Ai Creative Director | ElliottPrompts Ai Creative Studio | Other | [MINIMAL] | — | "Nothing yet on that from my experiences what about yourself?" | 2026-05-29 |
| Uma Rudd Chia | Singapore | OH MY STRAWBERRY | Other | [MINIMAL] | — | "I create my own AI videos and I subscribe to a lot of different AI platform… I know that I have the rights to them" | 2026-05-29 |
| Ray Gong | Associate Vice President | DSJ Global | Other | [MINIMAL] | — | "this isn't something I'm actively exploring, but I do see how this could be relevant as AI content adoption evolves." | 2026-05-29 |
| Alistair Bendyshe-Brown | CEO / Founder | Summer Day Media | Other | [MINIMAL] | — | "we don't need this at the moment. I'll keep you in mind if a need arises." | 2026-05-29 |
| Abbas Saleem - 游联宇 - سليم عباس | Llama & Griffin | Llama & Griffin | UAE/Dubai | [MINIMAL] | — | "you need to be upfront about your toolset because it will be upto the client to manage community and PR" | 2026-05-29 |
| Moein Al-Din Zarean | null | null | UAE/Dubai | [MINIMAL] | — | "most clients are currently still focused primarily on the quality of the final output… providing a 'Production Log' will soon become standard" | 2026-05-29 |
| Collins Agure | Senior Executive, Marketing & Communication | The Source | UAE/Dubai | [MINIMAL] | — | "the clients don't really care about how it was made… They only care that it is effective, looks cool and communicates their brand values" | 2026-05-29 |
| Keegan Desouza | null | Shaerp Next | UAE/Dubai | [MINIMAL] | — | "I dont think the legal side of things is mature yet, but i believe in a few months time this will be a big thing" | 2026-05-29 |
| Lucy Aziz | null | Burson | UAE/Dubai | [MINIMAL] | — | "Not really as long as we disclose it is made with help of AI" | 2026-05-29 |
| Ashraf Selo | Multimedia Designer | MultiBank Group | UAE/Dubai | [PASS] | — | "Yeah, starting to see this more now… confirmation everything is original or properly licensed… becoming standard with bigger campaigns." | 2026-05-29 |
| Manoj Reddy | Generative AI specialist and Production Manager | ALBAB Media LLC | UAE/Dubai | [MINIMAL] | — | "none of my clients have asked for that documentation yet. But I can see why it's becoming a bigger topic this year" | 2026-05-29 |
| Mohammed Magdy Alzahran | Prompt Engineer | Dybaja - ديباجة \| AI Creative Studio | UAE/Dubai | [MINIMAL] | — | "Yes some of clients ask for NDA first, and some times ask for Transfer of ownership rights" | 2026-05-29 |
| Joey Johnson | Creative Director | Mother | USA | [PASS] | — | "unfortunately this is not relevant to our working process at this time." | 2026-05-29 |
| Dan Ablan | Creative Director, Design and Multimedia | Association of International Certified Professional Accountants | USA | [MINIMAL] | — | "We're all set internally for now but if it changes I'll reach out." | 2026-05-29 |
| Jon Cvack | AV Producer/Director + Gen-AI Specialist | City of Los Angeles | USA | [MINIMAL] | — | "I'm actually not involved on the legal side. I just create the content… I can see where that would be a necessity at some point." | 2026-05-29 |
| Cam Cloman | Founder | Surf Noir Studios | USA | [PASS] | — | "it hasn't been an issue for me in any of my work but I'll keep you in mind in the future." | 2026-05-29 |
| Tim Koranda | Sr. Director of Creative Systems | TechStyleOS (now Fabletics) | USA | [MINIMAL] | — | "It really depends on the organization and the models being used. If a company uses indemnified models or train their own models, its a non issue." | 2026-05-29 |
| Brian Gaffney | VP of Product, Software Division | MTI Film | USA | [PASS] | — | "That's not relevant to our AI workflows." | 2026-05-29 |
| Derek Du Chesne | Chief Executive Officer, Director | Better U | USA | [MINIMAL] | — | "we already have arrangements and processes in place for how AI-generated video content is produced and reviewed" | 2026-05-29 |
| Joe Maziarski | Senior Creative AI Producer | Amazon | USA | [MINIMAL] | — | "They should be - it's a grey area. Platforms like firefly are built on cleared assets while others were conceivably trained on copy-written material." | 2026-05-29 |
| Emile Smith | Visual Effects Supervisor | Independent | USA | [MINIMAL] | — | "I actually haven't had anyone ask me for that as of yet. I am sure I will come across it though" | 2026-05-29 |
| Shyan Pawl | AI Filmmaker / Creative Director (Independent) | Self-employed | USA | [MINIMAL] | — | "Contracts already mention that the client agrees the content will be AI-generated and that the copyrights cannot be exclusively transferred" | 2026-05-29 |
| Evan Mathis | Senior Creative Director | Prime Video & Amazon MGM Studios | USA | [MINIMAL] | — | "in sports, we can not legally put any AI produced assets into any deliverables due to NIL and league rights agreements" | 2026-05-29 |
| Fred M Davis Agentic Agi | Account Executive | AIEntertainment (tm) | USA | [MINIMAL] | — | "Some do and some don't do real agreements. Most all do say what they did is AI. We should come up with a generic agreement" | 2026-05-29 |
| Shamus Halkowich | AI IMAGE AND VIDEO EXPERT | xAI | USA | [MINIMAL] | — | "Providence is super important for a Gen AI pipeline… The risk of using commercial engines is that the training data is not public or necessarily licensed" | 2026-05-29 |
| Lawrence Low | Sales Director & Leadgen | Positivity ® | Singapore | [PASS] | — | "No, I think with AI we just make videos, no need for review." | 2026-05-29 |
| Alan Geoy | Lead Motion Designer & GenAI Specialist | Antigravity Studio | Singapore | [PASS] | — | "It hasn't come up to me, but we are limited to certain ai tools that are approved by agencies / clients." | 2026-05-29 |
| Dominic Ho | Co-Founder | SYS.Studio | Singapore | [MINIMAL] | — | "I will let you know when we do need this service!" | 2026-05-29 |
| Jia Jin ( JJ ) Goh | Director | Alternate Video Production | Singapore | [WARM] | — | "all my client do not ask for documentation. We will tell them that some content are AI generated and they have commercial rights." | 2026-05-29 |
| Victor Masin | Co-Founder, Head of Creative | Always Wonder video agency | Singapore | [WARM] | — | "larger and more regulated clients are the ones who start asking how the cut was made. Still feels early." | 2026-05-29 |
| Ali Wahap | Senior Visual Designer, Video Editor & Social Content Creator | null | Singapore | [MINIMAL] | — | "Most of the times their legal just asks to make sure it's not copying likeness to known work" | 2026-05-29 |
| Al Hafeez Jamil | Creative Producer | The Daily Creative | Singapore | [WARM] | — | "we have not had client legal teams ask for that level of documentation just yet. However, we are actively preparing for it to become a standard practice soon." | 2026-05-29 |
| Raymond Choong | Lead Videographer | Craft Creative Pte Ltd | Singapore | [WARM] | — | "I actually haven't run into that just yet… What kind of documentation are they starting to ask for on your end?" | 2026-05-29 |
| Darius Shah | Creative Director \| Managing Partner | Meta Hive | Singapore | [WARM] | — | "Sure, send over the sample. Not something that has been relevant to us or our Current roster of clients. But curious to know more." | 2026-05-29 |
| Jian Yi Lay | Group Creative Director | VaynerMedia APAC | Singapore | [WARM] | — | "Before starting work, the usage of AI and which platform must be cleared by both agency and clients legal team first." | 2026-05-29 |
| Kris Tan | Generative A.i Artist | Mocreative Pte Ltd | Singapore | [MINIMAL] | — | "The methods, techniques, workflows, and training behind our process are… valuable assets… we do not disclose our complete internal workflow" | 2026-05-29 |
| sanjay revee | Executive Producer / Creative DIrector / TV Director | Various Companies | Singapore | [WARM] | — | "So far it's not cropped up. I guess if the AI actors look similar to well known personalities/celebrities then it's best to get consent" | 2026-05-29 |
| Victor Manggunio | Chief Product Designer | Viper Gears Private Limited | Singapore | [MINIMAL] | — | "as ethics and best practice rules start being more consistent, I'm sure it's going to be part of the release or contract stipulations" | 2026-05-29 |
| Henri Kang | AI Artist / Director / Generalist | Kartel.ai | Singapore | [WARM] | — | "the heavier legal/documentation side usually comes in with larger agencies, enterprise brands, or markets with stricter compliance requirements." | 2026-05-29 |
| Glenn Ng | null | Multi-disciplinary Creative Director & Film Director | Singapore | [MINIMAL] | — | "Usually these conversations are upfront (not at delivery), whether the brand is okay with AI usage" | 2026-05-29 |
| ROB GAX | Director of Creative & Content | KellerMedia | Singapore | [MINIMAL] | — | "the law states that whomever drafts the prompt owns the work… depends on usage… could be an infringement" | 2026-05-29 |
| Social Rebels | null | Creative Director \| Art-Based & Gen-AI Creative | Singapore | [MINIMAL] | — | "No, they don't. As we ensure that contents are original created." | 2026-05-29 |
| Benedict Chow Csp Cesga Mcieem | Director, Global EHS Operations | EFC International | Singapore | [PASS] | — | "I am not looking to arrange a call, but I will keep this in mind and get back to you if there is a relevant opportunity" | 2026-05-29 |
| Andrzej Wisniewski | Co-Founder | AWsome Growth | Singapore | [MINIMAL] | — | "Sounds like an interesting model you've built… Who's your ideal client profile right now?" | 2026-05-29 |
| Cj Cheung | Executive Producer 監製 | Orange Fever | Netherlands | [MINIMAL] | — | "we aren't doing much with AI, so I don't think your solution is the right fit for us right now" | 2026-05-29 |
| Marinus Bergsma | Founder & Creative Art Director | SocialNow | Netherlands | [MINIMAL] | — | "i make almost everything with ai so it's always clear before i start working for a client." | 2026-05-29 |
| Niloufar Davoudianfar | Creative Designer @Dyson | WPP Production | Netherlands | [MINIMAL] | — | "I'm not doing this actually 😅" | 2026-05-29 |
| Christiaan Compaan | Freelance Tech AI / Gen Ai | Freelance | Netherlands | [MINIMAL] | — | "I actually never had this issue because usually in preproduction all the assets that are used in the AI production already get sourced and approved." | 2026-05-29 |
| Quim Español | Creative Director | Monks | Netherlands | [MINIMAL] | — | "bigger companies tend to have more questions about the tooling, gen AI models used and sometimes a record of prompts used." | 2026-05-29 |
| Alessio Garbin | Global Digital Experience Director | Barilla Group | Netherlands | [MINIMAL] | — | "Hello, yes, indeed. They always ask 😉" — enterprise brand (Barilla) confirms legal teams always require documentation | 2026-05-29 |
| Gianni Lieuw-A-Soe | Member of The Supervisory Board | Internationaal Theater Amsterdam | Netherlands | [MINIMAL] | — | "No, not in my experience" | 2026-05-29 |
| Derek Bender | Staff Product Designer | Uber | Netherlands | [NAF] | — | "Interesting signal though, makes sense that's starting to surface at scale." | 2026-05-29 |
| Markus Müller-Hahnefeld | AI Trainer und Regisseur | Immersive AI: Academy & Production | Germany | [MINIMAL] | — | "This really depends on the project. Are you also a creator or what's the reason for your question?" | 2026-05-29 |
| Salomey Dankwah | Marketing Localization Management | TeamViewer | Germany | [WARM] | — | "I've noticed conversations around transparency and AI workflows becoming more common recently, especially for commercial campaigns." | 2026-05-29 |
| Robert Franke | CEO | Intaglio Films | Germany | [PASS] | — | "I only use ai which is trained on content I or my partners actually own so no need for retroactive rights clearance" | 2026-05-29 |
| Adrian Anuj Kuckian | Manager | PwC Deutschland | Germany | [MINIMAL] | — | "It depends on the customer and the use case" | 2026-05-29 |
| Tyler Vesneski | Video Content Creator | Sumsub | Germany | [MINIMAL] | — | "I know it has to go through legal, but I haven't experienced the documentation portion of it yet." | 2026-05-29 |
| Stéphane Martineau | Overseas, Remote and On-Site Animation Supervision | Netflix, Amazon, Disney | Germany | [MINIMAL] | — | "It has never happened to me yet, but I can guess that it will happen in the near future." | 2026-05-29 |
| Gulzar Junaid | Creative Partner | Kling AI | Germany | [MINIMAL] | — | "Most clients don't ask for production methodology unless it's explicitly part of the brief" — insider at Kling AI | 2026-05-29 |
| Vyra Sachse | AI Image & Video Consultant | xAI | Germany | [PASS] | — | "It's not relevant for me. I am working directly with xAI as an AI creative consultant." | 2026-05-29 |
| Sven Bliedung Von Der Heide | Chief Executive Officer | Volucap | Germany | [MINIMAL] | — | "Yes and we need to prove that we have our own trained models and use our own data which needs to comply with the EU." | 2026-05-29 |
| Magnus Leppaeniemi | Medgrundare | NextGen Venturez | Sweden/Stockholm | [WARM] | — | "Nope, legal teams don't care for the moment" | 2026-05-29 |
| Fredrik Rosengren | User Experience Designer | Embark Studios | Sweden/Stockholm | [MINIMAL] | — | "Copyright paradox: purely AI video may have no legal recourse to stop a competitor from downloading and using your exact video…" | 2026-05-29 |
| Henrik Sylvén | Creative AI Consultant | Henrik Sylvén International AB | Sweden/Stockholm | [WARM] | — | "EU AI Act coming into effect Aug 2 which is bound to raise the heads at legal 🙂" — EU Act urgency framing | 2026-05-29 |
| Nina Salehi | Digital Marketing Specialist | Envac | Sweden/Stockholm | [NAF] | — | "I don't use AI-generated video tools… legal teams want to ensure there are no copyright or privacy issues" | 2026-05-29 |
| Christian Schaffner | Chief Creative Officer (CCO) | Tallium Inc. | Sweden/Stockholm | [MINIMAL] | — | "Sometimes yes… One thing that I see more and more upcoming from legal is that they want to know what different tools I use and the T&C" | 2026-05-29 |
| David Pears | Co-Founder & CTO | NaviSavi Travel | Sweden/Stockholm | [MINIMAL] | — | "We don't deal with AI generated video." | 2026-05-29 |
| Marthe Vangman | Founder | Cléon Entertainment | Sweden/Stockholm | [MINIMAL] | — | "I don't deliver any AI videos for campaigns, I work with company in-house AI creators who produces the content." | 2026-05-29 |
| Giulio Musi | Managing Director of Chimney AI Studio | The Chimney Pot | Sweden/Stockholm | [MINIMAL] | — | "It totally depends on the client :) so we're very keen to discuss the legal frameworks before project go" | 2026-05-29 |

---

## Outreach Sent (0)

*JD has sent a discovery-focused follow-up. Waiting for response.*

| Lead | Title | Company | Geo | Last Action | Next Action | Follow Up By |
|------|-------|---------|-----|-------------|-------------|--------------|

---

## Call Booked (0)

*Discovery call confirmed on calendar.*

| Lead | Title | Company | Geo | Call Date | Focus Areas | Notes |
|------|-------|---------|-----|-----------|-------------|-------|

---

## Call Taken (0)

*Call happened. Notes captured.*

| Lead | Title | Company | Geo | Call Date | Key Findings | Insight Filed? |
|------|-------|---------|-----|-----------|--------------|----------------|

---

## Insight Documented (0)

*Key learnings written up and filed in Insights Archive.*

| Lead | Title | Company | Geo | Call Date | Insight Summary | Tags |
|------|-------|---------|-----|-----------|-----------------|------|

---

## Advisor / Beta (0)

*Ongoing relationship — invited into recurring feedback loop.*

| Lead | Title | Company | Geo | Role | Engagement Type | Last Contact |
|------|-------|---------|-----|------|-----------------|--------------|

<!-- discovery-pipeline:end -->

---

## Insights Archive

*Running log of key product learnings from discovery conversations.*
*Format: date · lead name · company · geo · key insight · tags*

<!-- insights:start -->

*(No insights logged yet. After each discovery call, add a bullet below.)*

<!-- insights:end -->

---

## Tag Reference

Use tags to group insights by theme in the archive:

| Tag | What it covers |
|-----|----------------|
| `#workflow` | How they currently handle AI video rights (process, tools, people) |
| `#pain` | Specific pain quantified — time, cost, frequency, deal impact |
| `#objection` | Why they said no or pushed back — reveals assumptions |
| `#competitive` | What they use instead (competitor, workaround, DIY approach) |
| `#edge-case` | Scenario or use case the product doesn't currently handle |
| `#pricing` | Signals about willingness to pay, budget, or cost framing |
| `#icp` | Insight that refines who the ideal customer is |
| `#regulatory` | Legal or compliance context — specific laws, frameworks, requirements |
| `#feature` | Product feature request or gap mentioned |
