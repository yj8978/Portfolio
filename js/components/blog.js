/**
 * blog.js — renders the blog index and individual posts from posts.json.
 * (Previously inline <script> blocks in blogs.html / blog.html.)
 */

import { qs, escapeHtml } from "../utils/dom.js";
import { observe } from "./reveal.js";

const POSTS_URL = "/posts.json";

const loadPosts = () =>
  fetch(POSTS_URL).then((response) => {
    if (!response.ok) throw new Error(`posts.json: HTTP ${response.status}`);
    return response.json();
  });

/** Blog index. */
export function initBlogList() {
  const list = qs("#blogList");
  if (!list) return;

  loadPosts()
    .then((posts) => {
      const published = posts.filter((post) => !post.draft);

      if (!published.length) {
        list.innerHTML =
          '<p class="muted">No posts published yet — check back soon.</p>';
        return;
      }

      list.innerHTML = published
        .map(
          (post, index) => `
          <article class="blog-card" data-reveal style="--reveal-delay:${Math.min(
            index * 70,
            350,
          )}ms">
            <a href="/blog.html?id=${encodeURIComponent(post.id)}">
              <h2>${escapeHtml(post.title)}</h2>
              <p>${escapeHtml(post.excerpt || "")}</p>
              <div class="blog-meta">${escapeHtml(post.date)} · ${escapeHtml(
                post.readTime || "",
              )}</div>
            </a>
          </article>`,
        )
        .join("");

      observe(list);
    })
    .catch((error) => {
      list.innerHTML =
        '<p class="muted">Could not load posts right now. Please try again later.</p>';
      console.error(error);
    });
}

/** Single post view, keyed off ?id= in the URL. */
export function initBlogPost() {
  const titleNode = qs("#title");
  if (!titleNode) return;

  const metaNode = qs("#meta");
  const contentNode = qs("#content");
  const postId = new URLSearchParams(window.location.search).get("id");

  loadPosts()
    .then((posts) => {
      const post = posts.find((item) => item.id === postId);

      if (!post) {
        titleNode.textContent = "Post not found";
        document.title = "Post not found · Yogesh Jirel";
        if (contentNode) {
          contentNode.innerHTML =
            '<p>That post does not exist. <a href="/blogs.html">Browse all posts</a>.</p>';
        }
        return;
      }

      titleNode.textContent = post.title;
      document.title = `${post.title} · Yogesh Jirel`;
      if (metaNode) {
        metaNode.textContent = `${post.date} · ${post.readTime || ""}`.trim();
      }
      if (contentNode) contentNode.innerHTML = post.content;
    })
    .catch((error) => {
      titleNode.textContent = "Could not load this post";
      console.error(error);
    });
}
