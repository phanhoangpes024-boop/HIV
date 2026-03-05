export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/admin", "/profile", "/signin", "/api"],
            },
        ],
        sitemap: "https://epihouse.org/sitemap.xml",
    };
}
