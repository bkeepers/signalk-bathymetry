import createDebug from "debug";
const debug = createDebug("signalk-bathymetry:dependencies");

export interface Dependency {
  command: string[];
  image?: string;
}

const dependencies: Record<string, Dependency> = {
  gdal_grid: {
    command: ['gdal_grid'],
    image: 'ghcr.io/osgeo/gdal:alpine-small-latest'
  },
  gdal_contour: {
    command: ['gdal_contour'],
    image: 'ghcr.io/osgeo/gdal:alpine-small-latest'
  },
  tippecanoe: {
    command: ['tippecanoe'],
    // TODO: use official release once this is merged: https://github.com/felt/tippecanoe/pull/348
    image: 'ghcr.io/bkeepers/tippecanoe:main'
  }
}

export async function detectDependencies({ configdir }: { configdir: string }) {
  await Promise.all(Object.values(dependencies).map(detectDependency));

  // commandExists(commands.gdal_grid[0]).catch(() => {

  // });
  // if (true /*!await  */) {
  //   if (await commandExists('docker')) {
  //     debug(`Using gdal from docker image ${dockerImages.gdal}`);
  //     await execa('docker', ['pull', dockerImages.gdal])
  //     commands.gdal_grid = useDockerCommand(dockerImages.gdal, configdir, 'gdal_grid');
  //     commands.gdal_contour = useDockerCommand(dockerImages.gdal, configdir, 'gdal_contour');
  //   } else {
  //     throw new Error(`gdal_grid not found. See https://github.com/bkeepers/signalk-bathymetry#dependencies`);
  //   }
  // }

  // if (!await commandExists('tippecanoe')) {
  //   if (await commandExists('docker')) {
  //     debug(`Using tippecanoe from docker image ${dockerImages.tippecanoe}`);
  //     await execa('docker', ['pull', dockerImages.gdal])
  //     commands.tippecanoe = useDockerCommand(dockerImages.tippecanoe, configdir, 'tippecanoe');
  //   } else {
  //     throw new Error(`tippecanoe not found. See https://github.com/bkeepers/signalk-bathymetry#dependencies`);
  //   }
  // }

  // return commands
}

async function detectDependency(dep: Dependency) {
  const { execa } = await import('execa');

  const [cmd, ...args] = dep.command;
  const { stdout, exitCode } = await execa(cmd, [...args, '--version'])

  if (exitCode === 0) {
    return {
      version: stdout
    }
  }

  if (dep.image) {
    try {
      return tryDockerCommand(dep.image, dep.command)
    } catch (e) {
      // Docker not available, fall through to next error
    }
  }

  throw new Error(`${cmd} not found. See https://github.com/bkeepers/signalk-bathymetry#dependencies`);
}

export async function tryDockerCommand(image: string, command: string[]) {
  const { execa } = await import('execa');

  const { exitCode } = await execa('docker', ['pull', image])

  if (exitCode !== 0) {
    throw new Error(`Failed to pull docker image ${image}`);
  }

  return detectDependency({
    command: ['docker', 'run', '--rm', '-v', `$configdir:$configdir`, image, ...command],
  })
  commands.gdal_grid = useDockerCommand(dockerImages.gdal, configdir, 'gdal_grid');
  commands.gdal_contour = useDockerCommand(dockerImages.gdal, configdir, 'gdal_contour');
  //   } else {
  //     throw new Error(`gdal_grid not found. See https://github.com/bkeepers/signalk-bathymetry#dependencies`);

  return ['docker', 'run', '--rm', '-v', `${configdir}:${configdir}`, image, command];
}

detectDependency(dependencies.gdal_grid).then(console.log).catch(console.error);
// commandExists('nope').then(console.log).catch(console.error);
// detectDependencies({ debug: console.log as Debugger, configdir: '/Users/bkeepers/.signalk' }).then(console.log).catch(console.error);
