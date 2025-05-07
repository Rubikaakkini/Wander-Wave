document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get("id");
    fetch("posts.json")
        .then(response => response.json())
        .then(posts => {
            let post = posts.find(p => p.id == postId);
            if (post) {
                document.getElementById("blog-content").innerHTML = `
                    <h2>${post.title}</h2>
                    <p><strong>${post.date}</strong></p>
                    <img src="${post.image}" alt="${post.title}" class="full-post-image">
                    <p>${post.content}</p>
                `;
            } else {
                document.getElementById("blog-content").innerHTML = `<p>Post not found.</p>`;
            }
        })
        .catch(error => console.log("Error loading post:", error));
});