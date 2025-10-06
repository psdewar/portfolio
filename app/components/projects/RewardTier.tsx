interface RewardTierProps {
  title: string;
  price: number;
  description: string;
  backers: number;
  estimatedDelivery: string;
  itemsIncluded: string[];
  isLimited?: boolean;
  limitedQuantity?: number;
  limitedRemaining?: number;
}

export function RewardTier({
  title,
  price,
  description,
  backers,
  estimatedDelivery,
  itemsIncluded,
  isLimited = false,
  limitedQuantity,
  limitedRemaining,
}: RewardTierProps) {
  const renderBackersDisplay = () => {
    if (backers === 0) return "0";
    return "👤".repeat(Math.min(backers, 5)) + (backers > 5 ? `+${backers - 5}` : "");
  };

  const renderLimitedInfo = () => {
    if (!isLimited) return null;

    if (limitedRemaining === 0) {
      return <p className="text-xs text-red-500 mb-3">All gone</p>;
    }

    if (limitedQuantity) {
      return <p className="text-xs text-gray-500 mb-3">Limited ({limitedQuantity} available)</p>;
    }

    return null;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className="font-bold text-gray-900">${price}</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span>Backers</span>
        <span>Estimated delivery</span>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <span>{renderBackersDisplay()}</span>
        <span>{estimatedDelivery}</span>
      </div>

      {renderLimitedInfo()}

      <p className="text-xs text-gray-500 mb-3">
        {itemsIncluded.length} item{itemsIncluded.length !== 1 ? "s" : ""} included
      </p>

      <p className="text-xs text-gray-700 mb-3">{itemsIncluded.join(", ")}</p>

      <button
        className="w-full py-2 px-4 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
        disabled={isLimited && limitedRemaining === 0}
      >
        {isLimited && limitedRemaining === 0 ? "Sold Out" : "Details"}
      </button>
    </div>
  );
}
