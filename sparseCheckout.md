Currently, cdnjs's repo is too huge, so that some people can not work hapily with it, here is a simple workwround for you to work with cdnjs hapily, that's sparse-checkout, it can let you checl out only the files your want, so that the whole direcotry in your computer won't need to be 11GB, but only about 1GB, very thiner, with shallow pull, it can be even thiner!

Here are the steps:

1. Create/initial a empty repo and enter it:

`$ git init cdnjs && cd cdnjs`

> Initialized empty Git repository in /home/peter/.git/

2. Enable sparseCheckout:

`$ git config core.sparseCheckout true`

3. Set what you want to checkout only, for examply, the jquery lib:

`$ echo 'ajax/libs/jquery/*' >> .git/info/sparse-checkout`

4. Set your remote, for examply:

`$ git remote add origin git://github.com/cdnjs/cdnjs.git`

If you already cloned a cdnjs repo, this time, you can set a local path to speed up, for example:

`$ git remote add origin ///home/peter/cdnjs.old`

5. Pull things into your new repo with shallow pull, for example, set depth to 10:

`$ git pull origin master --depth 10`

It's all done, you will only have jquery lib now, other files won't be checkedout, let's take a look at the space it used:

`$ du -d 1 -h`
> 18M     ./ajax

> 587M    ./.git

> 605M    .


The database behind git is only 587MB, and the whole repo is only 605MB, awsome!

What's the origin one?

`$ du -d 1 -h`

> 682M    ./.git

> 43M     ./scratch

> 16M     ./node_modules

> 12G     ./ajax

> 24K     ./test

> 32K     ./build

> 13G     .

The crazy 13GB/682MB haha ...

This tip can also avoid sortable/Sortable issue([#3650](https://github.com/cdnjs/cdnjs/issues/3650)) in case-insensitive filesystem, especially Mac OS.

Hope you like it!
