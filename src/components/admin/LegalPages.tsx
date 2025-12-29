"use client";

import { useState } from "react";

interface LegalPage {
  id: string;
  title: string;
  content: string;
  lastUpdated: string;
}

const initialPages: Record<string, LegalPage> = {
  terms: {
    id: "terms",
    title: "Termeni și Condiții",
    content: `# Termeni și Condiții - Imperiul Sui Juris

Ultimă actualizare: ${new Date().toLocaleDateString("ro-RO")}

## 1. Acceptarea Termenilor
Prin accesarea și utilizarea acestui site, acceptați acești termeni și condiții în întregime.

## 2. Licență de Utilizare
Vi se acordă o licență limitată, non-exclusivă și revocabilă pentru a accesa și utiliza acest site.

## 3. Disclaimer
Acest site este furnizat "așa cum este". Nu garantăm acuratețea informațiilor.

## 4. Limitarea Răspunderii
În niciun caz nu vom fi răspunzători pentru daune indirecte sau accidentale.

## 5. Modificări
Ne rezervăm dreptul de a modifica acești termeni oricând.`,
    lastUpdated: new Date().toISOString(),
  },
  privacy: {
    id: "privacy",
    title: "Politica de Confidențialitate",
    content: `# Politica de Confidențialitate - Imperiul Sui Juris

## Colectarea Datelor
Colectăm date personale doar cu consimțământul dumneavoastră.

## Utilizarea Datelor
Datele sunt utilizate pentru a îmbunătăți serviciile noastre și pentru procesarea tranzacțiilor.

## Securitatea
Implementăm măsuri de securitate pentru a proteja datele personale.

## Drepturi
Aveți dreptul de acces, rectificare și ștergere a datelor conform GDPR.

## Contact
Pentru întrebări privind confidențialitatea, contactați: privacy@imperiul-sui-luris.com`,
    lastUpdated: new Date().toISOString(),
  },
  rules: {
    id: "rules",
    title: "Reguli de Comunitate",
    content: `# Reguli de Comunitate - Imperiul Sui Juris

## 1. Respectul
Tratați alți membri cu respect și curtoazie.

## 2. Conținut Adecvat
Nu postați conținut ofensator, rasist, sexist sau discriminator.

## 3. Spam
Postarea repetată și inutilă nu este permisă.

## 4. Securitate
Nu partajați informații sensibile, parole sau date financiare.

## 5. Drepturi de Autor
Respectați drepturile de autor și proprietatea intelectuală.

## 6. Vânzări Neautorizate
Vânzările neautorizate de bunuri sau servicii sunt interzise.

## 7. Sancțiuni
Încălcarea regulilor poate duce la avertismente, suspensie sau ban permanent.`,
    lastUpdated: new Date().toISOString(),
  },
};

export default function AdminLegalPages() {
  const [pages, setPages] = useState<Record<string, LegalPage>>(initialPages);
  const [selectedPage, setSelectedPage] = useState("terms");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(
    pages[selectedPage].content
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const currentPage = pages[selectedPage];

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setMessage("Conținutul nu poate fi gol");
      return;
    }

    try {
      setIsSaving(true);
      setPages((prev) => ({
        ...prev,
        [selectedPage]: {
          ...prev[selectedPage],
          content: editedContent,
          lastUpdated: new Date().toISOString(),
        },
      }));

      localStorage.setItem(
        `legal_page_${selectedPage}`,
        JSON.stringify({
          content: editedContent,
          lastUpdated: new Date().toISOString(),
        })
      );

      setMessage("Pagina legală salvată cu succes!");
      setIsEditing(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Eroare la salvarea paginii");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Selector */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(pages).map((pageId) => (
          <button
            key={pageId}
            onClick={() => {
              setSelectedPage(pageId);
              setIsEditing(false);
            }}
            className={`px-4 py-3 rounded-lg font-medium transition text-sm ${
              selectedPage === pageId
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {pageId === "terms"
              ? "⚖️ Termeni"
              : pageId === "privacy"
              ? "🔒 Privacy"
              : "📋 Reguli"}
          </button>
        ))}
      </div>

      {/* Page Editor */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{currentPage.title}</h2>
            <p className="text-xs text-gray-400 mt-1">
              Ultima actualizare:{" "}
              {new Date(currentPage.lastUpdated).toLocaleDateString("ro-RO")}
            </p>
          </div>
          <button
            onClick={() => {
              setIsEditing(!isEditing);
              setEditedContent(currentPage.content);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
              isEditing
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isEditing ? "❌ Anulare" : "✏️ Editare"}
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              message.includes("succes")
                ? "bg-green-900 text-green-200"
                : "bg-red-900 text-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={15}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition"
            >
              {isSaving ? "Se salvează..." : "💾 Salvează Modificări"}
            </button>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none text-gray-300 text-sm">
            <div className="whitespace-pre-wrap">{currentPage.content}</div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="font-bold mb-4">👁️ Previzualizare Publică</h3>
        <p className="text-sm text-gray-400 mb-4">
          Aceasta este cum vor vedea utilizatorii pagina:
        </p>
        <div className="bg-gray-800 rounded-lg p-6 text-gray-200 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
          {currentPage.content.substring(0, 500)}...
        </div>
        <a
          href={`/${selectedPage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition text-center"
        >
          🔗 Vizualizează Pagina Finală
        </a>
      </div>
    </div>
  );
}
