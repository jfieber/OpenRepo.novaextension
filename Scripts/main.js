// Append an extension config/command name to the extension prefix
function ns(name) {
    return [nova.extension.identifier, name].join('.');
}

// Invoked by the "Open Repository" command
nova.commands.register(ns('cmd.open'), () => {
    const root = nova.path.expanduser(nova.config.get(ns('path')));

    // reverse sort by mtime
    paths = findRepoPaths(root, 0).sort((a, b) => {
        if (a.m === b.m) {
            return 0;
        }
        if (a.m < b.m) {
            return 1;
        }
        return -1;
    });

    // digest for what we'll give to showChoicePalette()
    shortpaths = paths.map((p) => {
        return p.p.replace(root, '').replace(/^\//, '');
    });

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
                    nova.openURL(
                        `nova://open?path=${encodeURIComponent(spath)}`
                    );
                }
            }
        );
    }
});

// Return an array of objects with the structure containing the path
// and the modified time of the .git directory.
// {
//    p: "filepath",
//    m: mtime
// }
function findRepoPaths(repoPath, depth) {
    if (depth > nova.config.get(ns('recurseDepth'))) {
        return [];
    }

    const found = isGitRepo(repoPath);
    if (found !== null) {
        return found;
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
    const gitPath = nova.path.join(repoPath, '.git');
    const stats = nova.fs.stat(gitPath);
    if (stats !== null && stats !== undefined) {
        // normal git directory
        if (stats.isDirectory()) {
            return [{ p: repoPath, m: stats.mtime }];
        }
        // git worktree
        if (stats.isFile()) {
            const f = nova.fs.open(gitPath, 'r');
            if (f !== null && f !== undefined) {
                const l = f.readline();
                if (l.match(/gitdir:/) != null) {
                    return [{ p: repoPath, m: stats.mtime }];
                }
            }
        }
    }
    return null;
}
