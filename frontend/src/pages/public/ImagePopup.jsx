
import { useEffect, useState } from "react";

const POPUP_IMAGE =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhBGOhEkLyRCFskaMo1X2a2MR-DjH-co6LoZ48nOvfPZKfTL-QCQxlihLa8S_HJqPkcC1gTTyawc98Q5r6jIYV01fNoPpSrEi3ShZzwZHQvwkFCdHNEErkGdhvxIjTLxswOHRpWNHt4g4I0OOvwNNDZwElEvEvHQuazEKb0HbRB6QowvrXj7yAzoVmv1ENM/s1600/arr.jpg";

export default function ImagePopup() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showPopup) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") setShowPopup(false);
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [showPopup]);

  if (!showPopup) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
      onClick={() => setShowPopup(false)}
    >
      <div
        className="relative w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowPopup(false)}
          className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold text-black shadow-lg hover:bg-gray-200"
          aria-label="Close popup"
        >
          &times;
        </button>

        <img
          src={POPUP_IMAGE}
          alt="AroviaSkillTech"
          className="max-h-[85vh] w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
