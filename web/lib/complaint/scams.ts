// Scam types as the government names them, each with the official line and its source
// (research/scam-types.md). The guard names the scam with these ids; the card shows the source.
export type Scam = { id: string; name: string; asks: string; official: string; source: string; url: string };

const BEAWARE = 'https://taxguru.in/wp-content/uploads/2021/07/A-Booklet-on-Modus-Operandi-of-Financial-Fraudsters.pdf';

export const SCAMS: Scam[] = [
  { id: 'fake_kyc', name: 'Fake KYC update', asks: 'KYC "expiring", account/SIM/gas/electricity to be blocked, then an OTP, link or app', official: '…with the intention of defrauding like KYC expiry or update of bank account/payment wallet/SIM/gas connection/electricity connection…', source: 'Chakshu, PIB 22 May 2024', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2021309' },
  { id: 'vishing_otp', name: 'Fake bank official asking for OTP or card details', asks: 'OTP, PIN, password, CVV, card number', official: 'Bank officials / financial institutions / any genuine entity never ask customers to share confidential information such as username / password / card details / CVV / OTP.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'pin_to_receive', name: 'PIN "to receive money"', asks: 'approve a request or enter UPI PIN to "receive" money', official: 'Always remember, to receive money there is no need to enter your PIN / password anywhere.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'qr_scan', name: 'QR code scam', asks: 'scan a QR code in a payment app', official: 'Fraudsters often contact customers under various pretext and trick them into scanning QR codes using payment apps.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'screen_share', name: 'Screen-sharing / remote app scam', asks: 'install AnyDesk, TeamViewer, QuickSupport or share screen', official: 'Do not download or activate share screen share feature with unknown people.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'digital_arrest', name: '"Digital arrest" (fake police, CBI, customs, TRAI)', asks: 'parcel with drugs, arrest threat, stay on video call, pay to "settle the case"', official: 'No regulatory body conducts investigations or collects payments through phone calls, messaging apps, or video platforms.', source: 'TRAI advisory, PIB 6 Aug 2025', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2153153' },
  { id: 'mobile_disconnection', name: 'Fake mobile disconnection (TRAI/DoT)', asks: 'number to be disconnected, "misused in illegal activities"', official: 'TRAI does not initiate communication with Customers regarding Mobile Number disconnection through messages or otherwise.', source: 'PIB 7 Apr 2025', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2119782' },
  { id: 'fake_customer_care', name: 'Fake customer-care number', asks: 'a "helpline" found online asks for card details for verification', official: 'Avoid searching for customer care contact details on search engine.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'job_task', name: 'Part-time job / task scam', asks: 'pay a fee, "load money" to unlock tasks or earnings', official: 'Always remember that a genuine company offering job will never ask for money.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'sim_swap', name: 'SIM swap', asks: '"free 4G upgrade", SIM details', official: 'Never share credentials pertaining to SIM card.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'lottery', name: 'Lottery / prize', asks: 'pay tax, shipping or processing fee to claim a prize', official: 'Do not make payments or share secure credentials for lottery calls / emails.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'reported_payee', name: 'UPI ID already in a fraud complaint', asks: 'payment to a UPI ID that an earlier complaint named', official: 'This UPI ID was named in an earlier fraud complaint made with UTR Pakka. Do not pay it.', source: 'UTR Pakka complaints (only a one-way hash of the ID is kept)', url: 'https://github.com/kinnuworks/utr-pakka#reported-before' },
  { id: 'suspicious_call', name: 'Suspicious call', asks: 'pressure to act on the call: a code, an app, a payment or a transfer', official: 'Bank officials / financial institutions / any genuine entity never ask customers to share confidential information such as username / password / card details / CVV / OTP.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
  { id: 'impersonation', name: 'Friend or relative asking for urgent money', asks: 'urgent money from a new number or profile', official: 'Always verify genuineness of fund request with the friend / relative or confirm by a phone call / physical meeting.', source: 'RBI BE(A)WARE booklet', url: BEAWARE },
];

export const SCAM_IDS = SCAMS.map((s) => s.id) as [string, ...string[]];
export const scamById = (id: string) => SCAMS.find((s) => s.id === id);
export const scamList = () => SCAMS.map((s) => `${s.id} (${s.name}: ${s.asks})`).join('; ');
