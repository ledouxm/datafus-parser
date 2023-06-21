import { initDatafusParser } from "./datafus";
import { readMessage } from "./parser";

export { initDatafusParser, readMessage };

const main = async () => {
    await initDatafusParser({ owner: "ledouxm", repo: "Datafus" });
};

main();
