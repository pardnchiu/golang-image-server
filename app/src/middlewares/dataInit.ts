export default async (req: any, res: any, cb: () => void) => {
    if (req.headers["user-agent"] == null) {
        res.socket.destroy();
        return;
    };

    cb();
};