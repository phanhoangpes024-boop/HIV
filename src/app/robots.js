export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/profile", "/signin", "/api"],
            },
        ],
        sitemap: "https://theepidemichouse.com/sitemap.xml",
    };
}
