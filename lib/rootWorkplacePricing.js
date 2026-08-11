export const ROOT_WORKPLACE_PRICES = {
  up_to_50: {
    key: "up_to_50",
    minEmployees: 1,
    maxEmployees: 50,
    label: "Up to 50 employees",
    monthlyPrice: 695,
    stripePriceId:
      "price_1U38qjC5Ez9YOIayIdL6socV",
  },

  up_to_150: {
    key: "up_to_150",
    minEmployees: 51,
    maxEmployees: 150,
    label: "51–150 employees",
    monthlyPrice: 1295,
    stripePriceId:
      "price_1U38qkC5Ez9YOIayOcrpSuyi",
  },

  up_to_500: {
    key: "up_to_500",
    minEmployees: 151,
    maxEmployees: 500,
    label: "151–500 employees",
    monthlyPrice: 2495,
    stripePriceId:
      "price_1U38qlC5Ez9YOIaya5NSXIyU",
  },

  up_to_1000: {
    key: "up_to_1000",
    minEmployees: 501,
    maxEmployees: 1000,
    label: "501–1,000 employees",
    monthlyPrice: 4495,
    stripePriceId:
      "price_1U38qmC5Ez9YOIayUODlCIV2",
  },
};

export function buildRootWorkplacePrice(
  workforceSize
) {
  const size =
    Number(workforceSize);

  if (
    !Number.isFinite(size) ||
    size <= 0
  ) {
    return {
      type: "unknown",
      workforceSize: null,
      canCheckout: false,
      requiresConversation: false,
      price: null,
    };
  }

  const roundedSize =
    Math.floor(size);

  const match =
    Object.values(
      ROOT_WORKPLACE_PRICES
    ).find(
      (price) =>
        roundedSize >=
          price.minEmployees &&
        roundedSize <=
          price.maxEmployees
    );

  if (match) {
    return {
      type: "fixed",
      workforceSize:
        roundedSize,
      canCheckout: true,
      requiresConversation: false,
      price: match,
    };
  }

  return {
    type: "enterprise",
    workforceSize:
      roundedSize,
    canCheckout: false,
    requiresConversation: true,

    price: {
      key: "enterprise",
      label:
        "More than 1,000 employees",
      monthlyPriceFrom: 6000,
      stripePriceId: null,
    },
  };
}
