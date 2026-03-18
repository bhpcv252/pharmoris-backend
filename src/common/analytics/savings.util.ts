export function calculateSavingsForMedicine(med: {
	targetPrice: number;
	priceObservations: {
		unitPrice: number;
		observedAt: Date;
		supplierId?: string;
	}[];
}) {
	if (!med.priceObservations.length) return null;

	const latest = med.priceObservations.reduce((prev, curr) =>
		new Date(curr.observedAt) > new Date(prev.observedAt) ? curr : prev,
	);

	// find lowest supplier price
	let lowestPrice = Infinity;
	let bestSupplierId: string | null = null;

	for (const obs of med.priceObservations) {
		if (obs.unitPrice < lowestPrice) {
			lowestPrice = obs.unitPrice;
			bestSupplierId = obs.supplierId || null;
		}
	}

	if (lowestPrice === Infinity) return null;

	// best possible price
	const benchmark = Math.min(med.targetPrice, lowestPrice);

	// savings calculation
	const potentialSavings =
		latest.unitPrice > benchmark ? latest.unitPrice - benchmark : 0;

	return {
		currentPrice: latest.unitPrice,
		lowestPrice,
		benchmark,
		potentialSavings,
		bestSupplierId,
	};
}
