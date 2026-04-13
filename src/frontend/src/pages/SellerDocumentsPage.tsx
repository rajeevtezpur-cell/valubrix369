import {
  Check,
  Download,
  Eye,
  FileText,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import SellerLayout from "../components/SellerLayout";

type DocFile = { name: string; url: string | null; isUploaded: boolean };

type DocCategory = {
  id: string;
  label: string;
  docs: DocFile[];
};

const INITIAL_CATEGORIES: DocCategory[] = [
  {
    id: "sale",
    label: "Sale Agreement",
    docs: [
      { name: "Draft_Sale_Agreement_v2.pdf", url: null, isUploaded: false },
      { name: "Final_Agreement_Signed.pdf", url: null, isUploaded: false },
    ],
  },
  {
    id: "property",
    label: "Property Documents",
    docs: [
      { name: "Title_Deed.pdf", url: null, isUploaded: false },
      { name: "Encumbrance_Certificate.pdf", url: null, isUploaded: false },
      { name: "Khata_Certificate.pdf", url: null, isUploaded: false },
    ],
  },
  {
    id: "id",
    label: "ID Proof",
    docs: [
      { name: "Aadhar_Card.pdf", url: null, isUploaded: false },
      { name: "PAN_Card.pdf", url: null, isUploaded: false },
    ],
  },
  {
    id: "noc",
    label: "NOC / Clearances",
    docs: [{ name: "Builder_NOC.pdf", url: null, isUploaded: false }],
  },
  { id: "ec", label: "Encumbrance Certificate", docs: [] },
];

const ACTIVITY = [
  {
    user: "Bank Officer (HDFC)",
    action: "Viewed",
    doc: "Title_Deed.pdf",
    time: "2 hours ago",
  },
  {
    user: "You",
    action: "Uploaded",
    doc: "Final_Agreement_Signed.pdf",
    time: "Yesterday",
  },
  {
    user: "Buyer (Arjun Mehta)",
    action: "Downloaded",
    doc: "Draft_Sale_Agreement_v2.pdf",
    time: "2 days ago",
  },
  {
    user: "You",
    action: "Shared",
    doc: "Encumbrance_Certificate.pdf",
    time: "3 days ago",
  },
];

export default function SellerDocumentsPage() {
  const [categories, setCategories] =
    useState<DocCategory[]>(INITIAL_CATEGORIES);
  const [shareDoc, setShareDoc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    catId: string;
    docName: string;
  } | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleUploadClick = (catId: string) => {
    fileInputRefs.current[catId]?.click();
  };

  const handleFilesSelected = (catId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newDocs: DocFile[] = Array.from(files).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      isUploaded: true,
    }));
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId ? { ...cat, docs: [...cat.docs, ...newDocs] } : cat,
      ),
    );
  };

  const handleDelete = (catId: string, docName: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, docs: cat.docs.filter((d) => d.name !== docName) }
          : cat,
      ),
    );
    setDeleteTarget(null);
  };

  const handleView = (doc: DocFile) => {
    if (doc.url) {
      window.open(doc.url, "_blank");
    } else {
      alert(
        `Viewing: ${doc.name}\n(Demo document — upload a real file to preview)`,
      );
    }
  };

  const handleDownload = (doc: DocFile) => {
    if (doc.url) {
      const a = document.createElement("a");
      a.href = doc.url;
      a.download = doc.name;
      a.click();
    } else {
      alert(
        `Download: ${doc.name}\n(Demo document — upload a real file to download)`,
      );
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Document <span className="text-[#D4AF37]">Vault</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Securely store and share your property documents
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {categories.map((cat, ci) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.08 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
              data-ocid={`seller.documents.category.item.${ci + 1}`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{cat.label}</h3>
                <button
                  type="button"
                  data-ocid="seller.documents.upload.button"
                  onClick={() => handleUploadClick(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-lg text-xs font-medium transition-all"
                >
                  <Upload size={12} /> Upload
                </button>
                <input
                  ref={(el) => {
                    fileInputRefs.current[cat.id] = el;
                  }}
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesSelected(cat.id, e.target.files)}
                />
              </div>
              {cat.docs.length === 0 ? (
                <button
                  type="button"
                  className="w-full border border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-[#D4AF37]/30 transition-all"
                  data-ocid="seller.documents.empty_state"
                  onClick={() => handleUploadClick(cat.id)}
                >
                  <Upload size={20} className="mx-auto mb-2 text-white/20" />
                  <p className="text-white/30 text-sm">
                    Click to upload documents
                  </p>
                </button>
              ) : (
                <div className="space-y-2">
                  {cat.docs.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center justify-between bg-white/3 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText
                          size={14}
                          className={
                            doc.isUploaded
                              ? "text-emerald-400"
                              : "text-[#D4AF37]"
                          }
                        />
                        <span className="text-white/70 text-sm truncate">
                          {doc.name}
                        </span>
                        {doc.isUploaded && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleView(doc)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-medium transition-all"
                        >
                          <Eye size={11} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-medium transition-all"
                        >
                          <Download size={11} /> Download
                        </button>
                        <button
                          type="button"
                          data-ocid="seller.documents.share.button"
                          onClick={() => setShareDoc(doc.name)}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-medium transition-all"
                        >
                          <Share2 size={11} /> Share
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              catId: cat.id,
                              docName: doc.name,
                            })
                          }
                          className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-all"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-5"
        >
          <h3 className="text-white font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {ACTIVITY.map((a) => (
              <div
                key={a.time + a.doc}
                className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <div className="w-7 h-7 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={12} className="text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                  <p className="text-white/70 text-sm">
                    <span className="text-white">{a.user}</span> {a.action}{" "}
                    <span className="text-[#D4AF37]">{a.doc}</span>
                  </p>
                </div>
                <p className="text-white/30 text-xs flex-shrink-0">{a.time}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <h3 className="text-white font-bold text-lg mb-2">
                Delete Document?
              </h3>
              <p className="text-white/50 text-sm mb-6">
                "{deleteTarget.docName}" will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleDelete(deleteTarget.catId, deleteTarget.docName)
                  }
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {shareDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            data-ocid="seller.documents.share.dialog"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#0A0F1F] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Share Securely</h3>
                <button
                  type="button"
                  data-ocid="seller.documents.share.close_button"
                  onClick={() => setShareDoc(null)}
                  className="text-white/40 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-white/50 text-sm mb-3">{shareDoc}</p>
              <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2 mb-4">
                <span className="text-white/40 text-xs flex-1 truncate">
                  https://vault.valubrix.com/doc/abc123xyz
                </span>
                <button
                  type="button"
                  data-ocid="seller.documents.share.confirm_button"
                  onClick={handleCopy}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={11} className="inline" /> Copied
                    </>
                  ) : (
                    "Copy Link"
                  )}
                </button>
              </div>
              <p className="text-white/30 text-xs">
                This link expires in 7 days and is accessible only to the
                recipient.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SellerLayout>
  );
}
