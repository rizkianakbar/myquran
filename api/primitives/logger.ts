import { type LoggerOptions, default as pino, type TransportSingleOptions } from 'pino';
import pinoPretty from 'pino-pretty';

/**
 * Logger options.
 */
export interface DefineLoggerOptions extends LoggerOptions {}

/**
 * The logger instance type.
 */
export type Logger = Awaited<ReturnType<typeof defineLogger>>;

/**
 * Define the logger instance.
 *
 * @param opts - The options.
 * @returns The logger.
 */
export async function defineLogger(opts: DefineLoggerOptions) {
  const transports: TransportSingleOptions[] = [];
  const commonOpts = {
    level: opts.level || 'info',
    redact: opts.redact || [],
    ...(transports.length > 0 && {
      transport: transports.length === 1 ? transports[0] : { targets: transports },
    }),
  } satisfies LoggerOptions;

  try {
    return pino(commonOpts, process.env.NODE_ENV !== 'production' && !process.env.VITEST ? pinoPretty() : undefined);
  } catch (_) {
    return pino(commonOpts);
  }
}
