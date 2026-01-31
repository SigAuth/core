export abstract class GenericLogger {
    abstract log(message: string, ...optionalParams: any[]): void;

    abstract error(message: string, ...optionalParams: any[]): void;

    abstract warn(message: string, ...optionalParams: any[]): void;

    abstract debug(message: string, ...optionalParams: any[]): void; 

    abstract verbose(message: string, ...optionalParams: any[]): void;

    abstract fatal(message: string, ...optionalParams: any[]): void;
}
