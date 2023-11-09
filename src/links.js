import { Trans } from '@lingui/macro'

export const links = [
  {
    name: <Trans id="links.tricks">Tricks</Trans>,
    url: "/",
    isActive: (path) => path === "/" || path.includes("tricks") || path === "/posttrick"
  },
];

