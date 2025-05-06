import { ServerAPI, Plugin, Delta } from '@signalk/server-api';
import { schema, Config } from './config';
import { Collector } from './streams/collector';
import { ToXyz } from './streams/xyz';
import { createWriteStream, existsSync } from 'fs'
import { join } from 'path'
import { PassThrough, pipeline, TransformCallback } from 'stream';

export default function (app: ServerAPI): Plugin {
  let unsubscribes: (() => void)[] = [];

  return {
    id: 'bathymetry',
    name: 'Bathymetry',
    // @ts-expect-error: remove after next signalk release
    description: 'collect and share bathymetry data',

    start(config: Config) {
      app.debug('Bathymetry plugin started!');
      const filename = join(app.getDataDirPath(), 'bathymetry-' + new Date().toISOString().split('T')[0] + '.csv');

      const collector = new Collector();
      const xyz = new ToXyz({ header: !existsSync(filename) });
      const file = createWriteStream(filename);

      pipeline(
        collector,
        xyz,
        file,
        (err) => {
          // @ts-expect-error
          if (err) app.error(err);
        }
      )

      // @ts-expect-error: remove after next signalk release
      app.subscriptionmanager.subscribe(
        collector.subscription,
        unsubscribes,
        (subscriptionError: string) => {
          app.error(subscriptionError)
        },
        (delta: Delta) => collector.onDelta(delta),
      )
    },

    stop() {
      unsubscribes.forEach((f) => f())
      unsubscribes = []
    },

    schema() {
      return schema;
    }
  }
}
