export default function ProductInfoCard({
  categoryName,
  price,
  location,
}: {
  categoryName: string;
  price: number;
  location: string;
}) {
  const purchased = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="mx-5 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-tc-border">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-display font-bold text-lg leading-tight pr-2">{categoryName}</h3>
        <span className="font-numeric font-bold text-tc-lime-dark text-xl">${price.toFixed(0)}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Purchased</div>
          <div className="font-semibold">{purchased}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Location</div>
          <div className="font-semibold">{location}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Price paid</div>
          <div className="font-semibold font-numeric">${price.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tc-muted">Category</div>
          <div className="font-semibold">{categoryName}</div>
        </div>
      </div>
    </div>
  );
}
