export const metadata = {
	title: 'Özellikler • CostikFinans',
	description: 'CostikFinans uygulamasının temel özellikleri ve PWA yetenekleri.',
}

export default function FeaturesPage() {
	const items = [
		{
			title: 'Gelir/Gider Takibi',
			desc: 'İşlemlerinizi kategori, tarih ve miktar ile kaydedin.',
		},
		{
			title: 'Çevrimdışı Kullanım',
			desc: 'İnternet olmadan da verilerinize erişin ve işlem ekleyin.',
		},
		{
			title: 'PWA Desteği',
			desc: 'Ana ekrana ekleyin, uygulama gibi tam ekran deneyim yaşayın.',
		},
		{
			title: 'Bildirimler',
			desc: 'Aylık özet ve hatırlatıcılar ile finansal farkındalık kazanın.',
		},
	]

	return (
		<div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
			<header className="space-y-2">
				<h1 className="text-3xl font-bold">CostikFinans Özellikleri</h1>
				<p className="text-muted-foreground">
					Kişisel finanslarınızı kolayca yönetin, bütçenizi kontrol altında tutun.
				</p>
			</header>

			<ul className="grid gap-4 sm:grid-cols-2">
				{items.map((it) => (
					<li key={it.title} className="rounded-lg border p-4">
						<h3 className="font-semibold mb-1">{it.title}</h3>
						<p className="text-sm text-muted-foreground">{it.desc}</p>
					</li>
				))}
			</ul>

			<section className="rounded-lg border p-4">
				<h2 className="font-semibold mb-2">Alan Adı</h2>
				<p className="text-sm text-muted-foreground">
					Site alan adınız: <strong>costikfinans.site</strong>
				</p>
			</section>
		</div>
	)
}
