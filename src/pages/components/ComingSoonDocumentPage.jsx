function ComingSoonDocumentPage({ title, icon, description }) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white px-4 py-6 sm:p-6">
      <div className="my-12 rounded-3xl border border-white/10 bg-[#101827] p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/20 text-2xl">
            {icon}
          </div>

          <div>
            <h1 className="text-2xl font-black">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
          <p className="text-sm text-slate-400">
            Page route and sidebar are ready. You can now paste the API page logic here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComingSoonDocumentPage;