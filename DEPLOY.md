# 🏥 دليل النشر الكامل — صيدلية الأهرام

## الخطوة 1: إنشاء مشروع Firebase

1. اذهب لـ **[console.firebase.google.com](https://console.firebase.google.com)**
2. اضغط **"إضافة مشروع"** → اختر اسم مثل `saydaliyat-alahram`
3. أوقف Google Analytics (مش ضروري) → **"إنشاء المشروع"**

---

## الخطوة 2: تفعيل Firestore

1. من القائمة اليسرى: **Build → Firestore Database**
2. اضغط **"Create database"**
3. اختر **"Start in test mode"** (مؤقتاً — سنؤمنه لاحقاً)
4. اختر المنطقة: **`europe-west1`** (الأقرب لموريتانيا)
5. اضغط **"Enable"**

---

## الخطوة 3: إنشاء Indexes في Firestore

الكود يحتاج indexes مركّبة. أضفها يدوياً:

1. في Firestore → **"Indexes"** → **"Composite"** → **"Create index"**

أضف هذه الـ indexes:

| Collection | Fields | Order |
|-----------|--------|-------|
| `shifts` | `status` ASC, `startTime` DESC | |
| `shifts` | `status` ASC, `endTime` DESC | |
| `expenses` | `shiftId` ASC, `timestamp` DESC | |
| `expenses` | `timestamp` ASC | |
| `transfers` | `shiftId` ASC, `timestamp` DESC | |

---

## الخطوة 4: الحصول على إعدادات Firebase

1. في Firebase Console → ⚙️ **Project Settings**
2. مرر للأسفل → **"Your apps"** → اضغط **"</> Web"**
3. سجّل اسم التطبيق → **"Register app"**
4. انسخ الـ `firebaseConfig` الظاهر

5. افتح ملف **`src/firebase.ts`** واستبدل القيم:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← ضع قيمتك هنا
  authDomain: "saydaliyat-alahram.firebaseapp.com",
  projectId: "saydaliyat-alahram",
  storageBucket: "saydaliyat-alahram.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## الخطوة 5: تأمين قاعدة البيانات

في Firestore → **"Rules"** → استبدل بهذا:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // السماح للجميع بالقراءة والكتابة (للاستخدام الداخلي)
    // يمكنك لاحقاً إضافة Authentication لتأمين إضافي
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

---

## الخطوة 6: تثبيت المكتبات وبناء المشروع

```bash
# افتح Terminal في مجلد المشروع
cd pharmacy_firebase

# ثبّت المكتبات
npm install

# ابنِ المشروع
npm run build
```

---

## الخطوة 7: النشر على Vercel (مجاني للأبد)

### الطريقة السهلة (بدون Git):

1. اذهب لـ **[vercel.com](https://vercel.com)** → سجّل بحساب Google
2. اضغط **"Add New Project"** → **"Browse"**
3. ارفع مجلد `dist` الذي تم إنشاؤه في الخطوة 6
4. اضغط **"Deploy"**

### أو عبر CLI:
```bash
npm install -g vercel
vercel login
vercel --prod
```

بعد النشر ستحصل على رابط مثل:
```
https://saydaliyat-alahram.vercel.app
```

---

## الخطوة 8: تثبيت التطبيق على الهاتف (Android)

1. افتح **Chrome** على الهاتف
2. ادخل الرابط
3. اضغط على ⋮ → **"إضافة إلى الشاشة الرئيسية"**
4. سيظهر التطبيق كأيقونة مثل أي تطبيق عادي ✅

---

## ملاحظات مهمة

- ✅ الداتا محفوظة في Firebase — لا تُحذف أبداً
- ✅ يعمل من أي هاتف أو كمبيوتر في العالم
- ✅ مجاني تماماً (Firebase free tier يكفي لصيدلية)
- ✅ لا يحتاج سيرفر خاص
- ⚠️ يحتاج إنترنت للعمل (ليس offline)

---

## حدود Firebase المجانية (Spark Plan)

| | الحد المجاني | الاستخدام المتوقع |
|--|--|--|
| القراءات | 50,000/يوم | ✅ يكفي بسهولة |
| الكتابات | 20,000/يوم | ✅ يكفي بسهولة |
| التخزين | 1 GB | ✅ يكفي لسنوات |
| النقل | 10 GB/شهر | ✅ يكفي |
