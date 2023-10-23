---
title: Ghosts of Done
layout: default
---


<ul class="postList">
    {% for post in site.posts limit: 5%}
    <li>
        <h2><a href="{{ site.baseurl}}{{ post.url }}">{{ post.title }}</a></h2>
        <em class="postDate">{{ post.name | split: "_" | first | date: "%d %b, %Y" }}</em>
        <article>{{ post.content }}</article>
        <p>■</p>
    </li>
    {% endfor %}

</ul>

<a href="{{ site.baseurl}}{{ "archive.html" }}">More</a>
