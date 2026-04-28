interface TNavMenuType {
  id: number;
  link: string;
  title: string;
  hasDropdown?: boolean;
  megamenu?: boolean;
  dropdownItems?: { link: string; title: string }[];
}
const nav_menus_list: TNavMenuType[] = [
  {
    id: 1,
    link: "#",
    title: "Home",
    hasDropdown: true,
    megamenu: false,
    dropdownItems: [
      { link: "/", title: "Home Style 01" },
      { link: "/home-2", title: "Home Style 02" },
      { link: "/home-3", title: "Home Style 03" },
      { link: "/home-4", title: "Home Style 04" },
      { link: "/home-5", title: "Home Style 05" },
    ],
  },
  {
    id: 2,
    link: "#",
    title: "Services",
    hasDropdown: true,
    megamenu: false,
    dropdownItems: [
      { link: "/service", title: "Services" },
      { link: "/service-details", title: "Service Details" },
    ],
  },
  {
    id: 3,
    link: "#",
    title: "Shop",
    hasDropdown: true,
    megamenu: false,
    dropdownItems: [
      { link: "/shop", title: "Shop" },
      { link: "/shop-details", title: "Shop Details" },
      { link: "/wishlist", title: "Wishlist" },
      { link: "/cart", title: "Cart" },
      { link: "/checkout", title: "Checkout" },
    ],
  },
  {
    id: 4,
    link: "#",
    title: "Blog",
    hasDropdown: true,
    megamenu: false,
    dropdownItems: [
      { link: "/blog", title: "Blog" },
      { link: "/blog-details", title: "Blog Details" },
    ],
  },
  {
    id: 5,
    link: "#",
    title: "Pages",
    hasDropdown: true,
    megamenu: false,
    dropdownItems: [
      { link: "/about", title: "About" },
      { link: "/portfolio", title: "Portfolio" },
      { link: "/portfolio-details", title: "Portfolio Details" },
      { link: "/team", title: "Team" },
      { link: "/team-details", title: "Team Details" },
      { link: "/faq", title: "FAQ" },
      { link: "/login", title: "Login" },
      { link: "/register", title: "Register" },
      { link: "/error-page", title: "404 Page" },
    ],
  },

  {
    id: 6,
    link: "/contact",
    title: "Contact",
  },
];

export default nav_menus_list;
