export const dynamic = "force-static";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // ── 1. Clear all data ──────────────────────────────────────────────
    await db.invoice.deleteMany();
    await db.task.deleteMany();
    await db.timelineEvent.deleteMany();
    await db.caseDocument.deleteMany();
    await db.case.deleteMany();
    await db.client.deleteMany();
    await db.lawyer.deleteMany();
    await db.aIConversation.deleteMany();

    // ── 2. Create Lawyer ───────────────────────────────────────────────
    const lawyer = await db.lawyer.create({
      data: {
        name: "Rajesh Kumar",
        email: "rajesh@aidraft.ai",
        phone: "+91-98101-23456",
        firmName: "Kumar & Associates",
        plan: "solo",
      },
    });

    // ── 3. Create Clients ──────────────────────────────────────────────
    const clients = await Promise.all([
      db.client.create({
        data: {
          name: "Priya Sharma",
          email: "priya.sharma@gmail.com",
          phone: "+91-99100-11111",
          address: "42, Hauz Khas Enclave, New Delhi - 110016",
        },
      }),
      db.client.create({
        data: {
          name: "Amit Verma",
          email: "amit.verma@yahoo.com",
          phone: "+91-98765-43210",
          address: "15, Sector 15, Noida, Uttar Pradesh - 201301",
        },
      }),
      db.client.create({
        data: {
          name: "Meena Devi",
          email: "meena.devi@outlook.com",
          phone: "+91-88267-89012",
          address: "7, Rajouri Garden, New Delhi - 110027",
        },
      }),
      db.client.create({
        data: {
          name: "Vikram Singh Rathore",
          email: "vikram.rathore@gmail.com",
          phone: "+91-99588-33445",
          address: "103, DLF Phase-III, Gurugram, Haryana - 122002",
        },
      }),
      db.client.create({
        data: {
          name: "Sunita Agarwal",
          email: "sunita.agarwal@gmail.com",
          phone: "+91-88009-76543",
          address: "B-12, Kirti Nagar, New Delhi - 110015",
        },
      }),
    ]);

    // ── 4. Create Cases ────────────────────────────────────────────────

    // Case 1: Property Dispute (Injunction) — HIGH
    const case1 = await db.case.create({
      data: {
        caseNumber: "CS(OS) 456/2024",
        title: "Sharma v. Gupta — Property Injunction Dispute",
        description:
          "Suit for permanent injunction restraining defendants from constructing unauthorized third floor on residential property at Hauz Khas. Plaintiff claims the construction violates sanctioned building plan and municipal bye-laws.",
        caseType: "injunction",
        subType: "permanent_injunction",
        status: "active",
        priority: "high",
        jurisdiction: "High Court of Delhi",
        courtName: "High Court of Delhi, New Delhi",
        judgeName: "Hon'ble Mr. Justice Suresh Kumar Kait",
        filingDate: new Date("2024-03-15"),
        nextHearing: new Date("2025-08-12"),
        parties: JSON.stringify({
          plaintiffs: ["Priya Sharma"],
          defendants: ["Ramesh Gupta", "Sunita Gupta"],
          advocates: ["Rajesh Kumar (for Plaintiff)"],
        }),
        keySections: JSON.stringify([
          "Order 39 Rules 1 & 2 CPC",
          "Section 338 Delhi Municipal Corporation Act",
          "Order 1 Rule 10 CPC",
        ]),
        lawyerId: lawyer.id,
        clientId: clients[0].id,
      },
    });

    // Case 2: Cheque Bounce (Section 138 NI Act) — MEDIUM
    const case2 = await db.case.create({
      data: {
        caseNumber: "CC 892/2024",
        title: "Verma v. Mehta — Cheque Bounce under Section 138 NI Act",
        description:
          "Criminal complaint under Section 138 of the Negotiable Instruments Act, 1881 for dishonour of cheque of Rs. 15,00,000 issued by defendant towards payment for goods supplied. Cheque returned unpaid with remarks 'insufficient funds'.",
        caseType: "civil",
        subType: "cheque_bounce",
        status: "active",
        priority: "medium",
        jurisdiction: "District Court, Saket",
        courtName: "District Court, Saket, New Delhi",
        judgeName: "Hon'ble Ms. Metropolitan Magistrate Anju Bala",
        filingDate: new Date("2024-06-20"),
        nextHearing: new Date("2025-07-28"),
        parties: JSON.stringify({
          complainants: ["Amit Verma"],
          accused: ["Sanjay Mehta"],
          witnesses: ["Rahul Jain (Bank Manager)"],
          advocates: ["Rajesh Kumar (for Complainant)"],
        }),
        keySections: JSON.stringify([
          "Section 138 Negotiable Instruments Act, 1881",
          "Section 141 NI Act (vicarious liability)",
          "Section 143A NI Act (interim compensation)",
          "Section 420 IPC (cheating)",
        ]),
        lawyerId: lawyer.id,
        clientId: clients[1].id,
      },
    });

    // Case 3: Divorce Petition (Mutual Consent) — MEDIUM
    const case3 = await db.case.create({
      data: {
        caseNumber: "HMA 234/2024",
        title: "Devi v. Devi — Divorce by Mutual Consent",
        description:
          "Petition for dissolution of marriage by mutual consent under Section 13B of the Hindu Marriage Act, 1955. Parties have been living separately for more than one year and have mutually agreed to dissolve the marriage. Settlement of alimony and child custody already agreed upon.",
        caseType: "divorce",
        subType: "mutual_consent",
        status: "active",
        priority: "medium",
        jurisdiction: "Family Court, Dwarka",
        courtName: "Family Court, Dwarka Courts Complex, New Delhi",
        judgeName: "Hon'ble Ms. Judge Rekha Sharma",
        filingDate: new Date("2024-04-10"),
        nextHearing: new Date("2025-08-05"),
        parties: JSON.stringify({
          petitioner: ["Meena Devi"],
          respondent: ["Rakesh Devi"],
          minorChild: ["Arjun Devi (age 8)"],
          advocates: [
            "Rajesh Kumar (for Petitioner)",
            "Adv. P.K. Jain (for Respondent)",
          ],
        }),
        keySections: JSON.stringify([
          "Section 13B Hindu Marriage Act, 1955",
          "Section 125 CrPC (maintenance)",
          "Guardian and Wards Act, 1890",
        ]),
        lawyerId: lawyer.id,
        clientId: clients[2].id,
      },
    });

    // Case 4: Consumer Complaint — LOW
    const case4 = await db.case.create({
      data: {
        caseNumber: "CC/2024/1567",
        title: "Rathore v. Samsung India Electronics — Consumer Complaint",
        description:
          "Consumer complaint against Samsung India Electronics for supply of defective refrigerator (Model: RT37K5982BS) within warranty period. Despite multiple repair attempts, the defect persists. Seeking refund of purchase price Rs. 65,000 along with compensation for mental agony and litigation costs.",
        caseType: "consumer",
        subType: "defective_product",
        status: "active",
        priority: "low",
        jurisdiction:
          "District Consumer Disputes Redressal Commission, Gurugram",
        courtName:
          "District Consumer Disputes Redressal Commission, Gurugram, Haryana",
        judgeName: "Hon'ble President Sh. D.R. Chaudhary",
        filingDate: new Date("2024-09-05"),
        nextHearing: new Date("2025-09-15"),
        parties: JSON.stringify({
          complainants: ["Vikram Singh Rathore"],
          oppositeParties: [
            "Samsung India Electronics Pvt. Ltd.",
            "M/s Reliance Digital (Authorized Dealer)",
          ],
          advocates: ["Rajesh Kumar (for Complainant)"],
        }),
        keySections: JSON.stringify([
          "Section 2(7) Consumer Protection Act, 2019",
          "Section 18 Consumer Protection Act, 2019 (product liability)",
          "Section 35 Consumer Protection Act, 2019",
        ]),
        lawyerId: lawyer.id,
        clientId: clients[3].id,
      },
    });

    // Case 5: Criminal Bail Application (Anticipatory Bail) — URGENT
    const case5 = await db.case.create({
      data: {
        caseNumber: "BAIL APPLN. 789/2025",
        title: "State v. Agarwal — Anticipatory Bail Application",
        description:
          "Anticipatory bail application under Section 438 CrPC in FIR No. 0147/2025 registered at Police Station Kirti Nagar under Sections 420, 467, 468, 471 IPC for alleged forgery and cheating in property documents. Applicant apprehends imminent arrest.",
        caseType: "bail",
        subType: "anticipatory_bail",
        status: "active",
        priority: "urgent",
        jurisdiction: "Sessions Court, Patiala House",
        courtName: "Sessions Court, Patiala House Courts Complex, New Delhi",
        judgeName: "Hon'ble Ms. Additional Sessions Judge Kamini Lau",
        filingDate: new Date("2025-01-10"),
        nextHearing: new Date("2025-07-25"),
        parties: JSON.stringify({
          applicants: ["Sunita Agarwal"],
          respondents: ["State of NCT of Delhi"],
          prosecutingAgency: "Delhi Police, PS Kirti Nagar",
          advocates: ["Rajesh Kumar (for Applicant)"],
        }),
        keySections: JSON.stringify([
          "Section 438 CrPC (anticipatory bail)",
          "Section 420 IPC (cheating)",
          "Section 467 IPC (forgery of valuable security)",
          "Section 468 IPC (forgery for purpose of cheating)",
          "Section 471 IPC (using as genuine a forged document)",
          "Section 41A CrPC (notice before arrest)",
        ]),
        lawyerId: lawyer.id,
        clientId: clients[4].id,
      },
    });

    // Case 6: Employment Dispute (Wrongful Termination) — MEDIUM
    const case6 = await db.case.create({
      data: {
        caseNumber: "ID 312/2024",
        title: "Agarwal v. TechMahindra Ltd. — Wrongful Termination",
        description:
          "Industrial dispute for wrongful termination of employment without due process. Petitioner was employed as Senior Software Engineer for 6 years and terminated citing 'restructuring' without serving mandatory notice period or paying retrenchment compensation as per Industrial Disputes Act.",
        caseType: "labour",
        subType: "wrongful_termination",
        status: "active",
        priority: "medium",
        jurisdiction: "Labour Court, Delhi",
        courtName: "Labour Court, Karkardooma Courts Complex, Delhi",
        judgeName: "Hon'ble Sh. Labour Court Judge V.K. Gupta",
        filingDate: new Date("2024-08-01"),
        nextHearing: new Date("2025-08-20"),
        parties: JSON.stringify({
          workmen: ["Sunita Agarwal"],
          employers: ["TechMahindra Limited", "M/s TechMahindra HR Department"],
          advocates: [
            "Rajesh Kumar (for Workman)",
            "Adv. S. Krishnan (for Management)",
          ],
        }),
        keySections: JSON.stringify([
          "Section 2A Industrial Disputes Act, 1947",
          "Section 25F Industrial Disputes Act (conditions precedent to retrenchment)",
          "Section 25FF Industrial Disputes Act (notice and compensation)",
          "Article 311 Constitution of India",
          "Payment of Gratuity Act, 1972",
        ]),
        lawyerId: lawyer.id,
        clientId: clients[4].id,
      },
    });

    // ── 5. Create Timeline Events ───────────────────────────────────────

    // Case 1 Timeline: Property Dispute
    await db.timelineEvent.createMany({
      data: [
        {
          title: "Filing of Plaint",
          description:
            "Suit for permanent injunction filed before High Court of Delhi along with application for temporary injunction under Order 39 Rule 1 & 2 CPC.",
          eventType: "filing",
          eventDate: new Date("2024-03-15"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case1.id,
        },
        {
          title: "Temporary Injunction Granted",
          description:
            "Court granted ad-interim ex-parte temporary injunction restraining defendants from carrying out any construction on the property. Notice issued to defendants.",
          eventType: "hearing",
          eventDate: new Date("2024-03-22"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case1.id,
        },
        {
          title: "Written Statement Filed by Defendants",
          description:
            "Defendants filed written statement denying allegations and claimed construction is as per approved building plan. Counter-affidavit filed.",
          eventType: "filing",
          eventDate: new Date("2024-06-10"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case1.id,
        },
        {
          title: "Reply to Written Statement",
          description: "Plaintiff's reply to defendants' written statement filed.",
          eventType: "filing",
          eventDate: new Date("2024-07-20"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case1.id,
        },
        {
          title: "Framing of Issues",
          description:
            "Court to frame issues on points for determination. Arguments on issues scheduled.",
          eventType: "hearing",
          eventDate: new Date("2025-08-12"),
          isCompleted: false,
          isMilestone: true,
          reminderSet: true,
          reminderAt: new Date("2025-08-09"),
          caseId: case1.id,
        },
      ],
    });

    // Case 2 Timeline: Cheque Bounce
    await db.timelineEvent.createMany({
      data: [
        {
          title: "Demand Notice Issued",
          description:
            "Legal demand notice under Section 138(2) NI Act issued by registered post to accused. Demand for Rs. 15,00,000 within 30 days.",
          eventType: "filing",
          eventDate: new Date("2024-04-15"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case2.id,
        },
        {
          title: "Filing of Criminal Complaint",
          description:
            "Criminal complaint under Section 138 NI Act filed before Metropolitan Magistrate. Accompanied by affidavit, copy of bounced cheque, bank memo, and demand notice.",
          eventType: "filing",
          eventDate: new Date("2024-06-20"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case2.id,
        },
        {
          title: "Summoning Order Passed",
          description:
            "Court issued summons to accused. Matter listed for appearance of accused.",
          eventType: "hearing",
          eventDate: new Date("2024-08-12"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case2.id,
        },
        {
          title: "Accused Appearance & Plea",
          description:
            "Accused appeared through counsel. Plea of not guilty recorded. Matter fixed for recording of complainant's evidence.",
          eventType: "hearing",
          eventDate: new Date("2024-11-05"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case2.id,
        },
        {
          title: "Complainant Evidence — Cross Examination",
          description:
            "Complainant evidence to resume. Cross-examination of PW-1 (complainant) by defense counsel.",
          eventType: "hearing",
          eventDate: new Date("2025-07-28"),
          isCompleted: false,
          isMilestone: true,
          reminderSet: true,
          reminderAt: new Date("2025-07-25"),
          caseId: case2.id,
        },
      ],
    });

    // Case 3 Timeline: Divorce
    await db.timelineEvent.createMany({
      data: [
        {
          title: "First Motion Filed",
          description:
            "Joint petition under Section 13B(1) HMA filed. Both parties appeared and confirmed voluntary consent. Court recorded statement.",
          eventType: "filing",
          eventDate: new Date("2024-04-10"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case3.id,
        },
        {
          title: "First Motion Allowed",
          description:
            "Court allowed first motion petition. Six-month cooling period commenced from this date.",
          eventType: "hearing",
          eventDate: new Date("2024-05-15"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case3.id,
        },
        {
          title: "Waiver Application for Cooling Period",
          description:
            "Application filed under Section 13B(2) proviso seeking waiver of statutory 6-month cooling period on grounds of settled matters and prolonged separation.",
          eventType: "filing",
          eventDate: new Date("2024-06-20"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case3.id,
        },
        {
          title: "Second Motion Hearing",
          description:
            "Second motion for dissolution of marriage listed. Parties to appear for final confirmation of consent.",
          eventType: "hearing",
          eventDate: new Date("2025-08-05"),
          isCompleted: false,
          isMilestone: true,
          reminderSet: true,
          reminderAt: new Date("2025-08-02"),
          caseId: case3.id,
        },
      ],
    });

    // Case 4 Timeline: Consumer Complaint
    await db.timelineEvent.createMany({
      data: [
        {
          title: "Complaint Filed",
          description:
            "Consumer complaint filed before District Consumer Disputes Redressal Commission with affidavit, purchase invoice, repair records, and correspondence with Samsung.",
          eventType: "filing",
          eventDate: new Date("2024-09-05"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case4.id,
        },
        {
          title: "Notice to Opposite Party",
          description:
            "Notice issued to Samsung India Electronics and Reliance Digital. Service completed.",
          eventType: "filing",
          eventDate: new Date("2024-10-10"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case4.id,
        },
        {
          title: "Version of Opposite Party",
          description:
            "Written version filed by Samsung. Contends product was misused. Offers replacement unit instead of refund.",
          eventType: "filing",
          eventDate: new Date("2024-12-15"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case4.id,
        },
        {
          title: "Rejoinder Filed",
          description:
            "Rejoinder to Samsung's version filed. Rebuttal with expert opinion on manufacturing defect.",
          eventType: "filing",
          eventDate: new Date("2025-01-20"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case4.id,
        },
        {
          title: "Arguments on Admission",
          description: "Matter listed for hearing on arguments. Evidence stage to be completed.",
          eventType: "hearing",
          eventDate: new Date("2025-09-15"),
          isCompleted: false,
          isMilestone: true,
          reminderSet: true,
          reminderAt: new Date("2025-09-12"),
          caseId: case4.id,
        },
      ],
    });

    // Case 5 Timeline: Anticipatory Bail
    await db.timelineEvent.createMany({
      data: [
        {
          title: "FIR Registered",
          description:
            "FIR No. 0147/2025 registered at PS Kirti Nagar under Sections 420, 467, 468, 471 IPC. Accused apprehends immediate arrest.",
          eventType: "filing",
          eventDate: new Date("2025-01-08"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case5.id,
        },
        {
          title: "Anticipatory Bail Application Filed",
          description:
            "Application under Section 438 CrPC filed before Sessions Court with detailed affidavit, FIR copy, and supporting documents.",
          eventType: "filing",
          eventDate: new Date("2025-01-10"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case5.id,
        },
        {
          title: "Interim Protection Granted",
          description:
            "Court granted interim protection from arrest till next date of hearing. Conditions imposed: cooperation with investigation, no tampering with evidence.",
          eventType: "hearing",
          eventDate: new Date("2025-01-12"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case5.id,
        },
        {
          title: "Arguments on Bail — Final Hearing",
          description:
            "Final arguments on anticipatory bail application. Public Prosecutor to present case. Chargesheet status to be ascertained.",
          eventType: "hearing",
          eventDate: new Date("2025-07-25"),
          isCompleted: false,
          isMilestone: true,
          reminderSet: true,
          reminderAt: new Date("2025-07-23"),
          caseId: case5.id,
        },
      ],
    });

    // Case 6 Timeline: Employment Dispute
    await db.timelineEvent.createMany({
      data: [
        {
          title: "Demand Notice Under Section 2A",
          description:
            "Notice under Section 2A of Industrial Disputes Act, 1947 issued to TechMahindra demanding reinstatement, back wages, and retrenchment compensation.",
          eventType: "filing",
          eventDate: new Date("2024-07-01"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case6.id,
        },
        {
          title: "Statement of Claim Filed",
          description:
            "Industrial dispute raised. Statement of claim filed before Labour Court seeking reinstatement with full back wages from date of termination.",
          eventType: "filing",
          eventDate: new Date("2024-08-01"),
          isCompleted: true,
          isMilestone: true,
          reminderSet: false,
          caseId: case6.id,
        },
        {
          title: "Management Version Filed",
          description:
            "TechMahindra filed written statement denying wrongful termination. Claims termination was due to restructuring under voluntary separation scheme.",
          eventType: "filing",
          eventDate: new Date("2024-10-15"),
          isCompleted: true,
          isMilestone: false,
          reminderSet: false,
          caseId: case6.id,
        },
        {
          title: "Applicant Evidence Stage",
          description:
            "Applicant's evidence to be recorded. Document list and witness list to be submitted.",
          eventType: "hearing",
          eventDate: new Date("2025-08-20"),
          isCompleted: false,
          isMilestone: true,
          reminderSet: true,
          reminderAt: new Date("2025-08-17"),
          caseId: case6.id,
        },
      ],
    });

    // ── 6. Create Tasks ────────────────────────────────────────────────

    // Case 1 Tasks: Property Dispute
    await db.task.createMany({
      data: [
        {
          title: "Prepare plaint affidavit for issues framing",
          description:
            "Draft detailed affidavit in support of framing of issues with reference to property documents, building plan sanctions, and municipal records.",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2025-08-10"),
          assignee: "Rajesh Kumar",
          taskType: "drafting",
          caseId: case1.id,
        },
        {
          title: "Obtain certified copy of building plan",
          description:
            "Apply for and obtain certified copy of sanctioned building plan from South Delhi Municipal Corporation.",
          status: "completed",
          priority: "high",
          dueDate: new Date("2024-08-30"),
          assignee: "Clerk - Ramesh",
          taskType: "filing",
          caseId: case1.id,
        },
        {
          title: "Engage civil engineer as expert witness",
          description:
            "Hire a government-approved valuer/civil engineer to prepare structural report on unauthorized construction.",
          status: "pending",
          priority: "medium",
          dueDate: new Date("2025-09-01"),
          assignee: "Rajesh Kumar",
          taskType: "research",
          caseId: case1.id,
        },
        {
          title: "File list of witnesses and documents",
          description:
            "Prepare and file consolidated list of witnesses (PW-1 to PW-5) and list of documents under Order 16 CPC.",
          status: "pending",
          priority: "medium",
          dueDate: new Date("2025-08-08"),
          assignee: "Junior - Ankit",
          taskType: "filing",
          caseId: case1.id,
        },
      ],
    });

    // Case 2 Tasks: Cheque Bounce
    await db.task.createMany({
      data: [
        {
          title: "Prepare examination-in-chief of complainant",
          description:
            "Draft examination-in-chief for complainant covering transaction details, issuance of cheque, presentment, and dishonour.",
          status: "completed",
          priority: "high",
          dueDate: new Date("2024-10-28"),
          assignee: "Rajesh Kumar",
          taskType: "drafting",
          caseId: case2.id,
        },
        {
          title: "Summon bank official as witness",
          description:
            "Issue court summons to branch manager, PNB, Sector 18, Noida for producing cheque return memo and account statement.",
          status: "in_progress",
          priority: "medium",
          dueDate: new Date("2025-07-20"),
          assignee: "Clerk - Ramesh",
          taskType: "filing",
          caseId: case2.id,
        },
        {
          title: "Collect and compile all documents for evidence",
          description:
            "Organize original cheque, demand notice with postal receipt, bank return memo, supply agreement, and delivery challans.",
          status: "completed",
          priority: "high",
          dueDate: new Date("2024-08-15"),
          assignee: "Junior - Ankit",
          taskType: "review",
          caseId: case2.id,
        },
      ],
    });

    // Case 3 Tasks: Divorce
    await db.task.createMany({
      data: [
        {
          title: "Draft consent terms and settlement deed",
          description:
            "Prepare comprehensive settlement deed covering alimony of Rs. 15,000/month, child custody (joint with primary custody to mother), and division of assets.",
          status: "completed",
          priority: "high",
          dueDate: new Date("2024-05-01"),
          assignee: "Rajesh Kumar",
          taskType: "drafting",
          caseId: case3.id,
        },
        {
          title: "Prepare affidavit for second motion",
          description:
            "Draft affidavits for both parties confirming no reconciliation, settlement terms, and consenting to dissolution.",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2025-08-03"),
          assignee: "Rajesh Kumar",
          taskType: "drafting",
          caseId: case3.id,
        },
        {
          title: "Obtain counseling certificate from family court",
          description:
            "Ensure parties have undergone mandatory counseling as per family court rules and obtain certificate.",
          status: "completed",
          priority: "medium",
          dueDate: new Date("2024-04-25"),
          assignee: "Junior - Ankit",
          taskType: "follow_up",
          caseId: case3.id,
        },
      ],
    });

    // Case 4 Tasks: Consumer Complaint
    await db.task.createMany({
      data: [
        {
          title: "Prepare argument notes for final hearing",
          description:
            "Compile case law references on product liability and consumer protection. Prepare concise argument notes on deficiency in service.",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2025-09-10"),
          assignee: "Rajesh Kumar",
          taskType: "research",
          caseId: case4.id,
        },
        {
          title: "Get expert opinion on refrigerator defect",
          description:
            "Engage an independent appliance repair expert to examine the refrigerator and provide written opinion on manufacturing defect.",
          status: "pending",
          priority: "medium",
          dueDate: new Date("2025-08-25"),
          assignee: "Rajesh Kumar",
          taskType: "research",
          caseId: case4.id,
        },
      ],
    });

    // Case 5 Tasks: Anticipatory Bail
    await db.task.createMany({
      data: [
        {
          title: "Compile supporting documents for bail",
          description:
            "Collect all supporting documents: property papers, identity proof, no criminal antecedents certificate, surety documents.",
          status: "completed",
          priority: "urgent",
          dueDate: new Date("2025-01-11"),
          assignee: "Rajesh Kumar",
          taskType: "filing",
          caseId: case5.id,
        },
        {
          title: "Prepare detailed bail affidavit",
          description:
            "Draft comprehensive affidavit covering facts, no flight risk, cooperation with investigation, and legal precedents for grant of anticipatory bail.",
          status: "completed",
          priority: "urgent",
          dueDate: new Date("2025-01-10"),
          assignee: "Rajesh Kumar",
          taskType: "drafting",
          caseId: case5.id,
        },
        {
          title: "Research case law on anticipatory bail",
          description:
            "Compile recent Supreme Court and High Court judgments on anticipatory bail in economic offenses and forgery cases.",
          status: "in_progress",
          priority: "high",
          dueDate: new Date("2025-07-23"),
          assignee: "Junior - Ankit",
          taskType: "research",
          caseId: case5.id,
        },
        {
          title: "Arrange surety and bail bond",
          description:
            "Coordinate with surety for bail bond preparation. Ensure surety documents (property papers, ID, address proof) are ready.",
          status: "pending",
          priority: "high",
          dueDate: new Date("2025-07-24"),
          assignee: "Clerk - Ramesh",
          taskType: "follow_up",
          caseId: case5.id,
        },
      ],
    });

    // Case 6 Tasks: Employment Dispute
    await db.task.createMany({
      data: [
        {
          title: "Draft detailed statement of claim",
          description:
            "Prepare detailed statement of claim with particulars of employment, salary, nature of termination, and relief sought including reinstatement and back wages.",
          status: "completed",
          priority: "high",
          dueDate: new Date("2024-07-25"),
          assignee: "Rajesh Kumar",
          taskType: "drafting",
          caseId: case6.id,
        },
        {
          title: "Collect salary slips and appointment letter",
          description:
            "Compile all employment records: appointment letter, increment letters, salary slips (last 12 months), Form 16, and termination letter.",
          status: "completed",
          priority: "high",
          dueDate: new Date("2024-07-15"),
          assignee: "Junior - Ankit",
          taskType: "review",
          caseId: case6.id,
        },
        {
          title: "Research precedents on wrongful termination",
          description:
            "Compile judgments on reinstatement and back wages under Industrial Disputes Act, particularly IT sector termination cases.",
          status: "pending",
          priority: "medium",
          dueDate: new Date("2025-08-15"),
          assignee: "Junior - Ankit",
          taskType: "research",
          caseId: case6.id,
        },
      ],
    });

    // ── 7. Create Documents ────────────────────────────────────────────

    // Case 1 Documents: Property Dispute
    await db.caseDocument.createMany({
      data: [
        {
          name: "Plaint — Suit for Permanent Injunction",
          type: "petition",
          category: "final",
          content:
            "IN THE HIGH COURT OF DELHI AT NEW DELHI\n\nC.S.(OS) No. 456/2024\n\nPRIYA SHARMA\nS/o Late Sh. K.L. Sharma\n42, Hauz Khas Enclave\nNew Delhi - 110016 ... Plaintiff\n\nVERSUS\n\nRAMESH GUPTA & ANR.\n15, Green Park Avenue\nNew Delhi - 110016 ... Defendants\n\nSUIT FOR PERMANENT INJUNCTION\n\nTo,\nThe Hon'ble High Court of Delhi\n\nThe plaintiff most respectfully submits:\n1. That the plaintiff is the absolute owner and in peaceful possession of property bearing No. 42, Hauz Khas Enclave, New Delhi.\n2. That the defendants, who are neighbours, have commenced construction of a third floor without any sanctioned building plan...",
          summary:
            "Plaint seeking permanent injunction restraining defendants from unauthorized construction on adjacent property.",
          caseId: case1.id,
        },
        {
          name: "Application for Temporary Injunction",
          type: "petition",
          category: "final",
          content:
            "APPLICATION UNDER ORDER 39 RULES 1 & 2 READ WITH SECTION 151 CPC\n\nAND IN THE MATTER OF\nC.S.(OS) No. 456/2024\n\nThe plaintiff hereby applies for ad-interim ex-parte temporary injunction restraining the defendants from carrying out any construction, raising any structure or making any addition to the existing structure at property bearing No. 15, Green Park Avenue, New Delhi...",
          summary:
            "Application for temporary injunction to maintain status quo during pendency of suit.",
          caseId: case1.id,
        },
        {
          name: "Property Sale Deed — 2015",
          type: "evidence",
          category: "received",
          content:
            "REGISTERED SALE DEED No. 4567\n\nDated: 15th March, 2015\n\nThis Deed of Sale executed on this 15th day of March, 2015, between: (1) Sh. M.K. Sharma, aged 65 years, S/o Late Sh. R.D. Sharma, Hindu, residing at 42, Hauz Khas Enclave, New Delhi, hereinafter referred to as the Vendor...",
          summary: "Registered sale deed evidencing plaintiff's ownership of the suit property.",
          caseId: case1.id,
        },
      ],
    });

    // Case 2 Documents: Cheque Bounce
    await db.caseDocument.createMany({
      data: [
        {
          name: "Criminal Complaint — Section 138 NI Act",
          type: "petition",
          category: "final",
          content:
            "IN THE COURT OF METROPOLITAN MAGISTRATE\nSAKET COURTS, NEW DELHI\n\nCC No. 892/2024\n\nState through Amit Verma\n... Complainant\n\nVersus\n\nSanjay Mehta\n... Accused\n\nUnder Section 138 of the Negotiable Instruments Act, 1881\n\nMOST RESPECTFULLY SHOWETH:\n1. That the complainant is a citizen of India carrying on business as a supplier of industrial equipment under the name and style of 'Verma Trading Co.' at Noida.\n2. That the accused had purchased goods worth Rs. 15,00,000 from the complainant during the period January-March 2024...",
          summary:
            "Criminal complaint for dishonour of cheque under Section 138 NI Act.",
          caseId: case2.id,
        },
        {
          name: "Legal Demand Notice — Section 138(2)",
          type: "notice",
          category: "final",
          content:
            "REGISTERED POST WITH A/D\n\nFROM:\nRajesh Kumar, Advocate\nKumar & Associates\nChamber No. 402, Lawyers' Chambers\nDistrict Court, Saket\nNew Delhi - 110017\n\nTO:\nSanjay Mehta\nR/o 23, Sector 22, Noida\nUttar Pradesh - 201301\n\nSUBJECT: LEGAL DEMAND NOTICE UNDER SECTION 138(2) OF THE NEGOTIABLE INSTRUMENTS ACT, 1881\n\nSir,\nUnder instructions from and on behalf of my client, M/s Verma Trading Co. through its proprietor Mr. Amit Verma, I hereby serve upon you the following legal notice...",
          summary:
            "Demand notice issued to accused under Section 138(2) NI Act.",
          caseId: case2.id,
        },
        {
          name: "Bounced Cheque Copy (Rs. 15,00,000)",
          type: "evidence",
          category: "received",
          content:
            "[Cheque Details]\nCheque No: 987654\nDate: 01-04-2024\nAmount: Rs. 15,00,000 (Rupees Fifteen Lakhs Only)\nBank: Punjab National Bank\nBranch: Sector 18, Noida\nAccount No: XXXX-XXXX-XXXX-4567\n\nStatus: DISHONOURED\nReason: Insufficient Funds\nReturn Memo Date: 05-04-2024",
          summary: "Copy of dishonoured cheque for Rs. 15,00,000 returned with remarks 'Insufficient Funds'.",
          caseId: case2.id,
        },
      ],
    });

    // Case 3 Documents: Divorce
    await db.caseDocument.createMany({
      data: [
        {
          name: "Joint Petition — Mutual Consent Divorce",
          type: "petition",
          category: "final",
          content:
            "IN THE FAMILY COURT, DWARKA\nNEW DELHI\n\nHMA No. 234/2024\n\nMEENA DEVI\nW/o Rakesh Devi\n7, Rajouri Garden\nNew Delhi - 110027 ... Petitioner\n\nVERSUS\n\nRAKESH DEVI\nS/o Sh. O.P. Devi\n12, Moti Nagar\nNew Delhi - 110015 ... Respondent\n\nPETITION FOR DISSOLUTION OF MARRIAGE\nUNDER SECTION 13-B OF THE HINDU MARRIAGE ACT, 1955\n\nMOST RESPECTFULLY SUBMITTH:\n1. That the marriage between the petitioner and respondent was solemnized on 15th February 2015 at Arya Samaj Mandir, Karol Bagh, New Delhi according to Hindu rites and ceremonies.",
          summary:
            "Joint petition for dissolution of marriage by mutual consent under Section 13B HMA.",
          caseId: case3.id,
        },
        {
          name: "Settlement Deed — Alimony & Custody",
          type: "agreement",
          category: "draft",
          content:
            "MEMORANDUM OF FAMILY SETTLEMENT\n\nThis Memorandum of Family Settlement made and executed on this 5th day of May, 2024, at New Delhi:\nBETWEEN\n(1) Meena Devi, W/o Rakesh Devi, Party of the First Part\n(2) Rakesh Devi, S/o O.P. Devi, Party of the Second Part\n\nTERMS OF SETTLEMENT:\n1. PERMANENT ALIMONY: The Second Party shall pay Rs. 15,000 per month as permanent alimony to the First Party.\n2. CHILD CUSTODY: Custody of minor child Arjun (aged 8 years) shall remain with the mother. Father shall have visitation rights every alternate weekend.",
          summary:
            "Draft settlement deed covering alimony, child custody, and asset division terms.",
          caseId: case3.id,
        },
        {
          name: "Marriage Certificate Copy",
          type: "evidence",
          category: "received",
          content:
            "MARRIAGE CERTIFICATE\n\nNo. MCD/2015/4567\n\nThis is to certify that the marriage between:\nGroom: Rakesh Devi, S/o Sh. O.P. Devi\nBride: Meena Devi, D/o Sh. R.P. Sharma\n\nwas solemnized on the 15th day of February, 2015 at Arya Samaj Mandir, Karol Bagh, New Delhi under Hindu rites and ceremonies.\n\nRegistered under Section 8 of the Hindu Marriage Act, 1955.",
          summary:
            "Copy of marriage certificate registered under Section 8 HMA.",
          caseId: case3.id,
        },
      ],
    });

    // Case 4 Documents: Consumer Complaint
    await db.caseDocument.createMany({
      data: [
        {
          name: "Consumer Complaint — Defective Product",
          type: "petition",
          category: "final",
          content:
            "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION\nGURUGRAM, HARYANA\n\nCC No. 2024/1567\n\nVikram Singh Rathore\n103, DLF Phase-III\nGurugram, Haryana - 122002 ... Complainant\n\nVERSUS\n\nSamsung India Electronics Pvt. Ltd.\nM/s Reliance Digital (Authorized Dealer)\n... Opposite Parties\n\nCOMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019\n\nThe complainant most respectfully submits:\n1. That the complainant purchased a Samsung refrigerator (Model: RT37K5982BS/HL) from M/s Reliance Digital, Ambience Mall, Gurugram on 15-01-2024 for a total sum of Rs. 65,000 (Invoice No. RD/2024/7890).",
          summary:
            "Consumer complaint seeking refund and compensation for defective Samsung refrigerator.",
          caseId: case4.id,
        },
        {
          name: "Purchase Invoice & Warranty Card",
          type: "evidence",
          category: "received",
          content:
            "RELIANCE DIGITAL\nTax Invoice\nInvoice No: RD/2024/7890\nDate: 15-01-2024\n\nItem: Samsung 345L Frost Free Double Door Refrigerator\nModel: RT37K5982BS/HL\nSerial No: RZ34C7890P\nAmount: Rs. 65,000 (incl. GST)\n\nWarranty: 10 Years on Compressor, 1 Year Comprehensive",
          summary:
            "Original purchase invoice and warranty card for Samsung refrigerator.",
          caseId: case4.id,
        },
      ],
    });

    // Case 5 Documents: Anticipatory Bail
    await db.caseDocument.createMany({
      data: [
        {
          name: "Anticipatory Bail Application — Section 438 CrPC",
          type: "petition",
          category: "final",
          content:
            "IN THE COURT OF ADDITIONAL SESSIONS JUDGE\nPATIALA HOUSE COURTS, NEW DELHI\n\nBAIL APPLICATION No. 789/2025\n\nIN THE MATTER OF:\nSunita Agarwal\nW/o Late Sh. K.K. Agarwal\nB-12, Kirti Nagar\nNew Delhi - 110015 ... Applicant\n\nVERSUS\n\nSTATE (NCT OF DELHI)\nThrough SHO, PS Kirti Nagar\n... Respondent\n\nAPPLICATION UNDER SECTION 438 CRPC FOR ANTICIPATORY BAIL\n\nMOST RESPECTFULLY SHOWETH:\n1. That FIR No. 0147/2025 has been registered at Police Station Kirti Nagar under Sections 420, 467, 468, 471 IPC.\n2. That the applicant apprehends immediate arrest in connection with the above-mentioned FIR.\n3. That the allegations are false and motivated.",
          summary:
            "Anticipatory bail application seeking pre-arrest protection under Section 438 CrPC.",
          caseId: case5.id,
        },
        {
          name: "Detailed Affidavit in Support of Bail",
          type: "affidavit",
          category: "final",
          content:
            "AFFIDAVIT\n\nI, Sunita Agarwal, W/o Late Sh. K.K. Agarwal, aged 52 years, residing at B-12, Kirti Nagar, New Delhi - 110015, do hereby solemnly affirm and declare as under:\n1. That I am the applicant in the above-titled bail application.\n2. That FIR No. 0147/2025 dated 08-01-2025 has been registered against me at PS Kirti Nagar under Sections 420, 467, 468, 471 IPC.\n3. That I am a law-abiding citizen with no criminal antecedents whatsoever.\n4. That the allegations are completely false and fabricated by property rivals.",
          summary:
            "Detailed affidavit denying allegations and establishing credentials for grant of bail.",
          caseId: case5.id,
        },
        {
          name: "FIR Copy No. 0147/2025",
          type: "court_order",
          category: "received",
          content:
            "FIRST INFORMATION REPORT\n\nFIR No: 0147/2025\nDate: 08-01-2025\nTime: 14:30 hours\n\nU/s 420, 467, 468, 471 IPC\n\nPS: Kirti Nagar\nDistrict: Central Delhi\n\nInformation given by: Sh. Deepak Malhotra, R/o 14, Kirti Nagar\n\nBrief facts: The informant stated that the accused Sunita Agarwal, in connivance with unknown persons, prepared forged property documents of Plot No. B-12, Kirti Nagar and attempted to sell the same to third parties using fabricated sale deeds...",
          summary: "Copy of FIR registered under Sections 420, 467, 468, 471 IPC.",
          caseId: case5.id,
        },
      ],
    });

    // Case 6 Documents: Employment Dispute
    await db.caseDocument.createMany({
      data: [
        {
          name: "Statement of Claim — Wrongful Termination",
          type: "petition",
          category: "final",
          content:
            "BEFORE THE LABOUR COURT\nKARKARDOOMA COURTS COMPLEX, DELHI\n\nI.D. No. 312/2024\n\nSunita Agarwal\nB-12, Kirti Nagar\nNew Delhi - 110015 ... Workman\n\nVERSUS\n\nTechMahindra Limited\nRajiv Gandhi Infotech Park\nPune, Maharashtra ... Employer\n\nSTATEMENT OF CLAIM\nUNDER SECTION 2A OF THE INDUSTRIAL DISPUTES ACT, 1947\n\nThe workman most respectfully submits:\n1. That the workman was appointed as Senior Software Engineer by TechMahindra Limited on 01-03-2018.\n2. That during employment, the workman consistently received 'Exceeds Expectations' performance rating.\n3. That on 15-06-2024, the workman was abruptly terminated citing 'organizational restructuring'.",
          summary:
            "Statement of claim seeking reinstatement and back wages for wrongful termination.",
          caseId: case6.id,
        },
        {
          name: "Termination Letter from TechMahindra",
          type: "evidence",
          category: "received",
          content:
            "TECHMAHINDRA LIMITED\nConfidential\n\nDate: 15-06-2024\n\nTo: Ms. Sunita Agarwal\nEmployee ID: TMH-28456\nDesignation: Senior Software Engineer\n\nSubject: Termination of Employment\n\nDear Ms. Agarwal,\nThis is to inform you that your employment with TechMahindra Limited is being terminated effective 30-06-2024 due to organizational restructuring under the Voluntary Separation Scheme.\n\nPlease note that you are required to serve a notice period of 30 days.\n\nFor: TechMahindra Human Resources",
          summary:
            "Termination letter dated 15-06-2024 citing organizational restructuring.",
          caseId: case6.id,
        },
      ],
    });

    // ── 8. Create Invoices ─────────────────────────────────────────────

    await db.invoice.create({
      data: {
        invoiceNumber: "INV/KA/2024/001",
        description:
          "Professional fees for filing and representation in property injunction matter — Suit No. CS(OS) 456/2024 (High Court of Delhi). Includes drafting of plaint, temporary injunction application, and three court appearances.",
        amount: 150000,
        gstAmount: 27000,
        totalAmount: 177000,
        status: "paid",
        issuedDate: new Date("2024-04-01"),
        dueDate: new Date("2024-04-30"),
        paidDate: new Date("2024-04-20"),
        caseId: case1.id,
        lawyerId: lawyer.id,
        items: JSON.stringify([
          {
            description: "Drafting of Plaint & Injunction Application",
            amount: 75000,
          },
          {
            description: "Court Appearances (3 hearings)",
            amount: 50000,
          },
          { description: "Miscellaneous — Photocopy, Courier, Travel", amount: 25000 },
        ]),
      },
    });

    await db.invoice.create({
      data: {
        invoiceNumber: "INV/KA/2024/002",
        description:
          "Legal fees for cheque bounce case — CC No. 892/2024 (District Court, Saket). Includes filing of criminal complaint, demand notice drafting, and evidence preparation.",
        amount: 80000,
        gstAmount: 14400,
        totalAmount: 94400,
        status: "paid",
        issuedDate: new Date("2024-07-01"),
        dueDate: new Date("2024-07-31"),
        paidDate: new Date("2024-07-25"),
        caseId: case2.id,
        lawyerId: lawyer.id,
        items: JSON.stringify([
          {
            description: "Drafting of Demand Notice & Criminal Complaint",
            amount: 35000,
          },
          {
            description: "Court Appearances (2 hearings)",
            amount: 30000,
          },
          { description: "Documentation & Filing charges", amount: 15000 },
        ]),
      },
    });

    await db.invoice.create({
      data: {
        invoiceNumber: "INV/KA/2025/003",
        description:
          "Legal fees for anticipatory bail application — BAIL APPLN. 789/2025 (Sessions Court, Patiala House). Urgent matter — includes bail drafting, affidavit preparation, and emergency court appearance.",
        amount: 120000,
        gstAmount: 21600,
        totalAmount: 141600,
        status: "pending",
        issuedDate: new Date("2025-01-12"),
        dueDate: new Date("2025-02-12"),
        caseId: case5.id,
        lawyerId: lawyer.id,
        items: JSON.stringify([
          {
            description: "Emergency Anticipatory Bail Drafting & Filing",
            amount: 60000,
          },
          {
            description: "Affidavit & Supporting Document Preparation",
            amount: 25000,
          },
          {
            description: "Interim Protection Hearing (Urgent Appearance)",
            amount: 35000,
          },
        ]),
      },
    });

    // ── 9. Return success ──────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      message: "AI Draft database seeded successfully with Indian legal case data",
      data: {
        lawyer: lawyer.name,
        clientsCount: clients.length,
        casesCount: 6,
        cases: [
          {
            id: case1.id,
            caseNumber: case1.caseNumber,
            title: case1.title,
            caseType: case1.caseType,
            priority: case1.priority,
          },
          {
            id: case2.id,
            caseNumber: case2.caseNumber,
            title: case2.title,
            caseType: case2.caseType,
            priority: case2.priority,
          },
          {
            id: case3.id,
            caseNumber: case3.caseNumber,
            title: case3.title,
            caseType: case3.caseType,
            priority: case3.priority,
          },
          {
            id: case4.id,
            caseNumber: case4.caseNumber,
            title: case4.title,
            caseType: case4.caseType,
            priority: case4.priority,
          },
          {
            id: case5.id,
            caseNumber: case5.caseNumber,
            title: case5.title,
            caseType: case5.caseType,
            priority: case5.priority,
          },
          {
            id: case6.id,
            caseNumber: case6.caseNumber,
            title: case6.title,
            caseType: case6.caseType,
            priority: case6.priority,
          },
        ],
        invoicesCount: 3,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed database",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
