import useData from "./useData";
import Single from "./charts/Single";
import Multi from "./charts/Multi";
import { memo } from "react";
import Stack from "./charts/Stack";

const Content = () => {
    const names = useData((state) => state.names);
    const model = useData((state) => state.model);
    console.log(model, names.length)
    return (
        <>
            {model === "v2" ? <Stack /> : model === "v1" ? (
                names.length === 1 ? (
                    <Single />
                ) : <Multi />
            ) : null}
        </>
    );
};

export default memo(Content);
