# Imperiu Sui Luris - Platform de Stat Virtual

O platformă de stat virtual dedicată libertății, fraternității și durabilității. Utilizatorii se pot alătura, cumpăra acte de cetățenie și teren, și să sprijine misiunea noastră de protejare a apei, hranei naturale și energiei curate.

## 🚀 Caracteristici Principale

### Utilizatori & Autentificare
- Înregistrare și autentificare sigură cu tokenuri JWT
- Profile de utilizatori cu informații personale
- Status de cetățenie (pending/active)
- Sistem de permisiuni și role-uri

### Piață & Comerț
- Cumpărare de documente (buletin, pașaport)
- Cumpărare de metale prețioase (argint, aur, diamant)
- Sistem de tranzacții și plăți
- Gestionare inventar

### Gestionare Teren
- Înregistrare proprietăți de teren
- Coordonate GPS și descrieri detaliate
- Tip de teren (agricol, pădure, apă, mixt)
- Acces permanent pentru cetățeni

### Administrator
- Feed de postări (doar administrator)
- Gestionare cetățeni
- Statistici platformei
- Control complet asupra pieței

### Interfață Utilizator
- Design modern și responsive
- Animații interactive (glob rotativ pe homepage)
- Interfață dark/sleek
- Optimizări SEO

## 📂 Structura Proiectului

```
imperiu-sui-luris/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API Routes
│   │   │   ├── auth/       # Autentificare
│   │   │   ├── users/      # Profiluri utilizatori
│   │   │   ├── marketplace/ # Piață
│   │   │   ├── feed/       # Feed administratori
│   │   │   └── land/       # Gestionare teren
│   │   ├── auth/           # Pagini auth
│   │   ├── dashboard/      # Dashboard utilizatori
│   │   ├── marketplace/    # Pagina piață
│   │   └── profile/        # Profiluri
│   ├── components/
│   │   ├── layout/         # Componente layout
│   │   ├── auth/           # Componente auth
│   │   ├── dashboard/      # Componente dashboard
│   │   ├── marketplace/    # Componente piață
│   │   └── admin/          # Componente admin
│   ├── lib/
│   │   ├── auth/           # Utilități autentificare
│   │   ├── api/            # Helper API
│   │   ├── db/             # Config bază de date
│   │   └── utils/          # Utilități generale
│   ├── types/              # TypeScript types
│   └── styles/             # Stiluri globale
└── backend/                # Backend Node.js (opțional)
```

## 🔧 Tehnologii Utilizate

### Frontend
- **Next.js 15** - React framework cu App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React** - UI library

### Backend
- **Next.js API Routes** - Backend serverless
- **Node.js** - Runtime

### Bază de Date
- Mock database (for development)
- PostgreSQL ready (for production)

## 🚀 Instalare & Setup

### Cerințe
- Node.js 18+
- npm/yarn/pnpm

### Pași

1. **Clonează sau accesează proiectul:**
```bash
cd imperiu-sui-luris
```

2. **Instalează dependențe:**
```bash
npm install
```

3. **Pornește serverul de development:**
```bash
npm run dev
```

4. **Accesează aplicația:**
```
http://localhost:3000
```

## 📝 Utilizatori de Test

### Admin
- Email: `admin@imperiu-sui-luris.com`
- Username: `admin_sui`
- Parola: `admin123` (setează-o)

### Cetățean Test
- Email: `citizen@imperiu-sui-luris.com`
- Username: `citizen_test`
- Parola: `test123` (setează-o)

## 🔌 API Endpoints

### Autentificare
- `POST /api/auth` - Register/Login
  - Actions: `register`, `login`

### Utilizatori
- `GET /api/users` - Get current user profile
- `POST /api/users` - Get specific user profile

### Piață
- `GET /api/marketplace` - Get marketplace items
- `POST /api/marketplace` - Purchase item

### Feed
- `GET /api/feed` - Get feed posts
- `POST /api/feed` - Create/Like/Comment post

### Teren
- `GET /api/land` - Get land properties
- `POST /api/land` - Add land property
- `PUT /api/land` - Update land property
- `DELETE /api/land` - Delete land property

## 🎨 Design & UX

- Tema dark cu gradienți de albastru/cyan
- Animații smooth și subtle
- Layout responsive pentru mobile/tablet/desktop
- Interfață intuitivă și accessible
- Icons și emoji pentru vizualizare mai bună

## 📱 Pagini Principale

- **Home (`/`)** - Landing page cu glob animat
- **Înregistrare (`/auth/register`)** - Creare cont
- **Autentificare (`/auth/login`)** - Login
- **Dashboard (`/dashboard`)** - Profil utilizator
- **Piață (`/marketplace`)** - Cumpărare iteme
- **Profil (`/profile`)** - Detalii cont

## 🔐 Securitate

- Token-based authentication (JWT)
- Password hashing (base64 for dev, bcrypt for production)
- Protected routes
- CORS ready
- Input validation

## 📊 Statistics Tracked

- Total cetățeni activi
- Total teren protejat (hectare)
- Total fonduri colectate (credits)
- Total documente emise
- Misiuni: Apă, Hrană, Energie

## 🌐 Deployment

### Vercel
```bash
vercel deploy
```

### Docker
```dockerfile
# Dockerfile included for production deployment
```

### Variabile de Mediu
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://yourdomain.com
JWT_SECRET=your-secret-key
```

## 📚 Documentație Suplimentară

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

Contribuțiile sunt bine-venite! Urmează acești pași:
1. Fork proiectul
2. Creează o branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit schimbările (`git commit -m 'Add some AmazingFeature'`)
4. Push la branch (`git push origin feature/AmazingFeature`)
5. Deschide un Pull Request

## 📄 Licență

MIT License - vezi LICENSE file pentru detalii

## 🎯 Roadmap Viitor

- [ ] Sistem de plăți cu stripe/PayPal
- [ ] Bază de date PostgreSQL cu Prisma
- [ ] Gestionare avansată de teren cu hartă
- [ ] Mobile app cu React Native
- [ ] Notificări email
- [ ] Sistem de mesaje direct
- [ ] Gestionare impozite și donații
- [ ] Analytics și rapoarte
- [ ] Two-factor authentication
- [ ] Cloud storage pentru documente

## 💬 Contact & Support

Email: info@imperiu-sui-luris.com

---

**Libertate • Fraternitate • Durabilitate** ⚡💧🌾
