---
title: "Lesson 1. Your first PHP program"
description: "Run PHP from the terminal, print text, and complete your first exercise."
author: LexusAlex
durationMinutes: null
sidebar:
  order: 1
---

:::note[Sample lesson]
This is the first sample lesson in the course. Use it to explore code examples, complete an exercise, and try saving your progress.
:::

## What you will learn

- Check the PHP version in your terminal.
- Create and run a file containing PHP code.
- Print text using `echo`.

## What you need

A text editor, a terminal, and **PHP** installed. Check your version:

```sh
php --version
```

The first line shows your installed PHP version. Use a supported release from the [official PHP website](https://www.php.net/downloads.php). If the command is not found, follow the [official installation instructions](https://www.php.net/manual/en/install.php) and add PHP to your `PATH`.

:::tip[PHP and the course website]
PHP is only required to run the examples on your own computer. The course website itself uses Astro and does not execute PHP code in the browser.
:::

## Your first program

Create a file named `hello.php` in a separate folder and save it as UTF-8:

```php title="hello.php"
<?php

echo 'Hello, PHP!', PHP_EOL;
```

Here is what the code does:

- `<?php` starts PHP code.
- `echo` prints text. Text values are enclosed in quotes.
- `PHP_EOL` adds a line ending for the current operating system.
- `;` ends the statement.

In a file containing only PHP code, the closing `?>` tag is usually omitted. This helps prevent accidental output of whitespace after the code.

Open a terminal in the folder containing the file and run:

```sh
php hello.php
```

Expected output:

```text
Hello, PHP!
```

You do not need a web server for this example: PHP runs the file directly in the terminal. This lesson uses basic language syntax without targeting a specific release.

## Exercise

Change `hello.php` so it prints two lines:

```text
I am learning PHP.
This is my first program.
```

Save the file and run `php hello.php` again. Check both the text and the line break.

<details>
<summary>Show the solution</summary>

```php title="hello.php"
<?php

echo 'I am learning PHP.', PHP_EOL;
echo 'This is my first program.', PHP_EOL;
```

</details>

## Check your understanding

1. What does `<?php` indicate?
2. What does `echo` do?
3. What happens if you remove `PHP_EOL` from the first line of the solution?

Once you have run the example and completed the exercise, tick **“Lesson completed”** below the lesson. Your choice is saved in this browser and shared between the Russian and English translations.

## Further reading

- [Running PHP from the command line](https://www.php.net/manual/en/features.commandline.usage.php).
- [Opening and closing PHP tags](https://www.php.net/manual/en/language.basic-syntax.phptags.php).
