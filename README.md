# Copybara

Simple HTML preprocessor for static sites. Made specificaly for a personal website of mine.

## Install

Copybara runs on [https://deno.land/](Deno).

```bash
# install with deno install
deno install --allow-read --allow-write [TODO put link]
```

## Run

```bash
# run with default arguments
copybara

# specify input and output
copybara -i src/template.html -o build/

# display help
copybara -h
```

## Use

Copybara wraps HTML files with other HTML files. Let's call them _content files_ and _templates_.

The simplest usecase is to provide the same header and footer for every file. The template may look like this:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Awesome website</title>
</head>
<body>
    
    <header>My awesome website</header>

    <!-- !cb-wrap subpages -->

    <footer>Made by me</footer>

</body>
</html>
```

In this case we specified the _subpages_ directory for the `cb-wrap` command. This is where the content files are located. 
There may be any number of them. An example content file:

```html
<h1>An article</h1>
<h2>Why is my website awesome?</h2>
<p>Because it is</p>
```

The file structure looks like this:

```
template.html
subpages/
--- article.html
--- about.html
--- contact.html
```

If you run the command:

```bash
copybara -i template.html -o public
```

It will create the `public` directory so that the final structure looks like this:

```
template.html
subpages/
--- article.html
--- about.html
--- contact.html
public/
--- subpages/
------- article.html
------- about.html
------- contact.html
```

The generated `public/subpages/article.html` file contains the following:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Awesome website</title>
</head>
<body>
    
    <header>My awesome website</header>

    <h1>An article</h1>
    <h2>Why is my website awesome?</h2>
    <p>Because it is</p>

    <footer>Made by me</footer>

</body>
</html>
```

The `subpages/article.html` file has been wrapped by `template.html` in place of the `<!-- !cb-wrap subpages -->` command. 
The same has happened to all other files inside the `subpages` directory.

## Command line

The following command line options are available:

Option | Alias | Default | Description
--- | --- | --- | ---
--input | -i | ./src/template.html | The file to start processing from (the main template)
--out | -o | ./out | The folder in which to put the processed files
--help | -h | n/a | Displays the list of commands
