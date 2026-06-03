// AI Draft - Firebase Cloud Functions (Node.js 22)
// API routes for AI-powered legal document features

export { apiAiChat } from "./ai-chat";
export { apiAiDocument } from "./ai-document";
export { apiAiDraft } from "./ai-draft";
export { apiAiIntake } from "./ai-intake";
export { apiAiResearch } from "./ai-research";
export { apiAiLitigation } from "./ai-litigation";
export { apiExtractFile } from "./ai-extract-file";
export { apiCrmSync } from "./crm-sync";

// Execution Module
export { apiAiExecution } from "./ai-execution";

// Civil Original Side Module
export { apiAiCivil } from "./ai-civil";

// Criminal Law Module (Bail, CRP, Writs)
export { apiAiCriminal } from "./ai-criminal";

// Family & Motor Accident Module (HMOP, DOP, MVOP, Succession, Guardian)
export { apiAiFamily } from "./ai-family";

// AI Data Extraction from Uploaded Documents
export { apiAiExtractData } from "./ai-extract-data";

// Razorpay Payment Gateway
export { apiRazorpayCreateOrder } from "./razorpay";
export { apiRazorpayVerify } from "./razorpay";

// Custom Auth (works without Identity Platform)
export { authGoogleUrl } from "./custom-auth";
export { authGoogleCallback } from "./custom-auth";
export { authGoogle } from "./custom-auth";
export { authEmailSignup } from "./custom-auth";
export { authEmailSignin } from "./custom-auth";
export { authPhoneSend } from "./custom-auth";
export { authPhoneVerify } from "./custom-auth";
export { authVerify } from "./custom-auth";
export { apiUserData } from './user-data';


// File Upload (Storage)
export { fileUploadUrl } from './file-upload';
export { fileDelete } from './file-upload';
export { fileList } from './file-upload';