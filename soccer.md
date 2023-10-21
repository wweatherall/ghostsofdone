---
layout: default
---

This is a test

{% for agegroup in site.soccer %}
{{ agegroup.title }}
U{{-agegroup.maxage}} is really fun
*U{{-agegroup.maxage}} is for players born in {{ "now" | date: "%Y" | minus: agegroup.maxage }} and {{ "now" | date: "%Y" | minus: agegroup.maxage | plus: 1 }}*


{{ agegroup.content }}

Playing with fire here lol

U{{-agegroup.maxage}} is for kids between the ages of <script>document.write(new Date().getFullYear()-{{agegroup.maxage}});</script>

and <script>document.write(new Date().getFullYear()-{{agegroup.maxage | minus: 1}});</script>

{% endfor %}
