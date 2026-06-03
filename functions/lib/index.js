"use strict";
// AI Draft - Firebase Cloud Functions (Node.js 22)
// API routes for AI-powered legal document features
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileList = exports.fileDelete = exports.fileUploadUrl = exports.apiUserData = exports.authVerify = exports.authPhoneVerify = exports.authPhoneSend = exports.authEmailSignin = exports.authEmailSignup = exports.authGoogle = exports.authGoogleCallback = exports.authGoogleUrl = exports.apiRazorpayVerify = exports.apiRazorpayCreateOrder = exports.apiAiExtractData = exports.apiAiFamily = exports.apiAiCriminal = exports.apiAiCivil = exports.apiAiExecution = exports.apiCrmSync = exports.apiExtractFile = exports.apiAiLitigation = exports.apiAiResearch = exports.apiAiIntake = exports.apiAiDraft = exports.apiAiDocument = exports.apiAiChat = void 0;
var ai_chat_1 = require("./ai-chat");
Object.defineProperty(exports, "apiAiChat", { enumerable: true, get: function () { return ai_chat_1.apiAiChat; } });
var ai_document_1 = require("./ai-document");
Object.defineProperty(exports, "apiAiDocument", { enumerable: true, get: function () { return ai_document_1.apiAiDocument; } });
var ai_draft_1 = require("./ai-draft");
Object.defineProperty(exports, "apiAiDraft", { enumerable: true, get: function () { return ai_draft_1.apiAiDraft; } });
var ai_intake_1 = require("./ai-intake");
Object.defineProperty(exports, "apiAiIntake", { enumerable: true, get: function () { return ai_intake_1.apiAiIntake; } });
var ai_research_1 = require("./ai-research");
Object.defineProperty(exports, "apiAiResearch", { enumerable: true, get: function () { return ai_research_1.apiAiResearch; } });
var ai_litigation_1 = require("./ai-litigation");
Object.defineProperty(exports, "apiAiLitigation", { enumerable: true, get: function () { return ai_litigation_1.apiAiLitigation; } });
var ai_extract_file_1 = require("./ai-extract-file");
Object.defineProperty(exports, "apiExtractFile", { enumerable: true, get: function () { return ai_extract_file_1.apiExtractFile; } });
var crm_sync_1 = require("./crm-sync");
Object.defineProperty(exports, "apiCrmSync", { enumerable: true, get: function () { return crm_sync_1.apiCrmSync; } });
// Execution Module
var ai_execution_1 = require("./ai-execution");
Object.defineProperty(exports, "apiAiExecution", { enumerable: true, get: function () { return ai_execution_1.apiAiExecution; } });
// Civil Original Side Module
var ai_civil_1 = require("./ai-civil");
Object.defineProperty(exports, "apiAiCivil", { enumerable: true, get: function () { return ai_civil_1.apiAiCivil; } });
// Criminal Law Module (Bail, CRP, Writs)
var ai_criminal_1 = require("./ai-criminal");
Object.defineProperty(exports, "apiAiCriminal", { enumerable: true, get: function () { return ai_criminal_1.apiAiCriminal; } });
// Family & Motor Accident Module (HMOP, DOP, MVOP, Succession, Guardian)
var ai_family_1 = require("./ai-family");
Object.defineProperty(exports, "apiAiFamily", { enumerable: true, get: function () { return ai_family_1.apiAiFamily; } });
// AI Data Extraction from Uploaded Documents
var ai_extract_data_1 = require("./ai-extract-data");
Object.defineProperty(exports, "apiAiExtractData", { enumerable: true, get: function () { return ai_extract_data_1.apiAiExtractData; } });
// Razorpay Payment Gateway
var razorpay_1 = require("./razorpay");
Object.defineProperty(exports, "apiRazorpayCreateOrder", { enumerable: true, get: function () { return razorpay_1.apiRazorpayCreateOrder; } });
var razorpay_2 = require("./razorpay");
Object.defineProperty(exports, "apiRazorpayVerify", { enumerable: true, get: function () { return razorpay_2.apiRazorpayVerify; } });
// Custom Auth (works without Identity Platform)
var custom_auth_1 = require("./custom-auth");
Object.defineProperty(exports, "authGoogleUrl", { enumerable: true, get: function () { return custom_auth_1.authGoogleUrl; } });
var custom_auth_2 = require("./custom-auth");
Object.defineProperty(exports, "authGoogleCallback", { enumerable: true, get: function () { return custom_auth_2.authGoogleCallback; } });
var custom_auth_3 = require("./custom-auth");
Object.defineProperty(exports, "authGoogle", { enumerable: true, get: function () { return custom_auth_3.authGoogle; } });
var custom_auth_4 = require("./custom-auth");
Object.defineProperty(exports, "authEmailSignup", { enumerable: true, get: function () { return custom_auth_4.authEmailSignup; } });
var custom_auth_5 = require("./custom-auth");
Object.defineProperty(exports, "authEmailSignin", { enumerable: true, get: function () { return custom_auth_5.authEmailSignin; } });
var custom_auth_6 = require("./custom-auth");
Object.defineProperty(exports, "authPhoneSend", { enumerable: true, get: function () { return custom_auth_6.authPhoneSend; } });
var custom_auth_7 = require("./custom-auth");
Object.defineProperty(exports, "authPhoneVerify", { enumerable: true, get: function () { return custom_auth_7.authPhoneVerify; } });
var custom_auth_8 = require("./custom-auth");
Object.defineProperty(exports, "authVerify", { enumerable: true, get: function () { return custom_auth_8.authVerify; } });
var user_data_1 = require("./user-data");
Object.defineProperty(exports, "apiUserData", { enumerable: true, get: function () { return user_data_1.apiUserData; } });
// File Upload (Storage)
var file_upload_1 = require("./file-upload");
Object.defineProperty(exports, "fileUploadUrl", { enumerable: true, get: function () { return file_upload_1.fileUploadUrl; } });
var file_upload_2 = require("./file-upload");
Object.defineProperty(exports, "fileDelete", { enumerable: true, get: function () { return file_upload_2.fileDelete; } });
var file_upload_3 = require("./file-upload");
Object.defineProperty(exports, "fileList", { enumerable: true, get: function () { return file_upload_3.fileList; } });
