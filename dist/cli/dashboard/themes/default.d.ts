export namespace screen {
    let bg: string;
    let fg: string;
}
export namespace box {
    namespace border {
        let fg_1: string;
        export { fg_1 as fg };
    }
    namespace focus {
        export namespace border_1 {
            let fg_2: string;
            export { fg_2 as fg };
        }
        export { border_1 as border };
    }
}
export namespace list {
    namespace item {
        let fg_3: string;
        export { fg_3 as fg };
        let bg_1: string;
        export { bg_1 as bg };
    }
    namespace selected {
        let fg_4: string;
        export { fg_4 as fg };
        let bg_2: string;
        export { bg_2 as bg };
        export let bold: boolean;
    }
}
export namespace log {
    let fg_5: string;
    export { fg_5 as fg };
    let bg_3: string;
    export { bg_3 as bg };
    export namespace scrollbar {
        let bg_4: string;
        export { bg_4 as bg };
        let fg_6: string;
        export { fg_6 as fg };
    }
}
export namespace dialog {
    export namespace border_2 {
        let fg_7: string;
        export { fg_7 as fg };
    }
    export { border_2 as border };
    export let shadow: boolean;
}
export namespace helpBar {
    let fg_8: string;
    export { fg_8 as fg };
    let bg_5: string;
    export { bg_5 as bg };
    let bold_1: boolean;
    export { bold_1 as bold };
}
export namespace colors {
    let primary: string;
    let secondary: string;
    let success: string;
    let warning: string;
    let error: string;
    let info: string;
    let muted: string;
}
export namespace status {
    export let active: string;
    export let idle: string;
    export let busy: string;
    let error_1: string;
    export { error_1 as error };
}
export namespace messageTypes {
    export let chat: string;
    export let system: string;
    let error_2: string;
    export { error_2 as error };
    let warning_1: string;
    export { warning_1 as warning };
    let success_1: string;
    export { success_1 as success };
    export let task: string;
    export let diversity: string;
}
//# sourceMappingURL=default.d.ts.map