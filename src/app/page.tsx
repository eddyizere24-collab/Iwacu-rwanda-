export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
          <span className="text-2xl font-bold" aria-hidden>
            IR
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          IWACU RWANDA
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Menya aho uri n&apos;abayobozi bawe mu Rwanda ukoresheje GPS.
          Nta konti isabwa. Nta amateka y&apos;aho wagiye.
        </p>
        <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-foreground">
            Urubuga ruri gutegurwa
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Serivisi y&apos;ubusabe bwa GPS n&apos;abayobozi izagaragara vuba.
            Build ya Vercel ubu ikora neza.
          </p>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          NCSA Law No. 058/2021 · Privacy first
        </p>
      </div>
    </main>
  );
}
