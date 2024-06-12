export const once = <F extends (...args: any[]) => any>(callback: F) => {
    let isCalled = false;

    return (...args: Parameters<F>) => {
        if (isCalled) return;
        isCalled = true;
        return callback(...args);
    };
};
