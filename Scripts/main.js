// Append an extension config/command name to the extension prefix
function ns(name) {
    return [nova.extension.identifier, name].join('.');
}

// Invoked by the "Open Repository" command
nova.commands.register(ns('cmd.open'), () => {
    root = nova.path.expanduser(nova.config.get(ns('path')));
    paths = findRepoPaths(root, 0);

    shortpaths = paths
        .map((p) => {
            return p.replace(root, '').replace(/^\//, '');
        })
        .sort();
    if (shortpaths.length < 1) {
        nova.workspace.showErrorMessage(
            `No git repositories found in:\n\n${root}`
        );
    } else {
        nova.workspace.showChoicePalette(
            shortpaths,
            { placeholder: 'Repository' },
            (selectedPath) => {
                if (selectedPath) {
                    const spath = nova.path.join(root, selectedPath);
                    console.info(`The path selected is ${spath}`);
                    launchNova(spath);
                }
            }
        );
    }
});

function launchNova(selectedPath) {
    var options = {
        args: ['-a', 'Nova', selectedPath],
        cwd: selectedPath,
    };
    var process = new Process('/usr/bin/open', options);
    process.onStdout(function (line) {
        console.log(line);
    });
    process.onStderr(function (line) {
        console.log(line);
    });
    process.onDidExit(function (rc) {
        console.log(`open ${options.args.join(' ')} exited ${rc}`);
    });
    process.start();
}

function findRepoPaths(repoPath, depth) {
    if (depth > nova.config.get(ns('recurseDepth'))) {
        return [];
    }

    if (isGitRepo(repoPath)) {
        return [repoPath];
    }

    var subdirs;
    try {
        subdirs = nova.fs.listdir(repoPath);
    } catch {
        return [];
    }
    return subdirs.flatMap((item) => {
        return findRepoPaths(nova.path.join(repoPath, item), depth + 1);
    });
}

function isGitRepo(repoPath) {
    const stats = nova.fs.stat(nova.path.join(repoPath, '.git', 'config'));
    return stats !== null && stats !== undefined && stats.isFile();
}
