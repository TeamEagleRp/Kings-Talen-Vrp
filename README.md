# Kings Talen vRp Website

## التشغيل

1. ثبّت Node.js 18+.
2. افتح PowerShell داخل مجلد المشروع.
3. نفّذ:
   npm install
4. انسخ `.env.example` إلى `.env`.
5. ضع بيانات Discord OAuth داخل `.env`.
6. شغّل:
   npm start
7. افتح:
   http://localhost:3070

## Discord OAuth

في Discord Developer Portal:
- أنشئ OAuth2 Application.
- ضع Redirect URI:
  `http://localhost:3070/auth/discord/callback`
- فعّل scope: `identify`.
- ضع Client ID و Client Secret في `.env`.

## الصور

ضع الصور التي طلبتها داخل:
`public/assets/`

الأسماء المطلوبة:
- `1.webp` شعار الخادم
- `2.webp` الخلفية
- `3.webp` صورة المؤسس الأول
- `4.webp` صورة المؤسس الثاني
- `35.png` صورة المصمم
- `15.png` صورة سيرفر الرعاية

## الإدارة

المسؤولون المسموح لهم بإضافة/حذف الإنجازات ورؤية السجل موجودون في `index.js` داخل `ADMIN_IDS`.

الإنجازات محفوظة في `data/achievements.json`.
السجل محفوظ في `data/logs.json`.
صور الإنجازات التي يرفعها المسؤول تحفظ تلقائياً في `uploads/`.

## البورت

البورت الافتراضي هو 3070، ويمكن تغييره من `.env`.
