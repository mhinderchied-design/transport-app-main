"use client";

export default function Home() {
  const handleClick = () => {
    alert("Bouton cliqué !");
  };

  return (
    <main style={{ padding: "40px" }}>
      <h1>🚀 Mon App Transport</h1>
      <p>Bienvenue 👋</p>

      <button onClick={handleClick}>
        Cliquer ici
      </button>
    </main>
  );
}