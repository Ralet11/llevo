export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#1E3A5F]">
      <h1 className="text-6xl font-bold text-white tracking-tight">
        LLEVO
      </h1>
      <p className="mt-3 text-lg text-blue-200">
        Conectamos viajes con necesidades.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/trips"
          className="px-6 py-3 bg-amber-400 text-gray-900 font-semibold rounded-lg hover:bg-amber-300 transition"
        >
          Buscar viaje
        </a>
        <a
          href="/publish"
          className="px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white/10 transition"
        >
          Publicar viaje
        </a>
      </div>
    </main>
  )
}
