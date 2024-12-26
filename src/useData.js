import { create } from "zustand";
import { cacheModel, cacheNames, getCacheModel, getCacheNames } from "./utils";


const useData = create((set, get) => ({
    dict: null,
    setDict: (dict) => set({ dict }),
    file: null,
    setFile: (file) => set({ file }),
    names: getCacheNames(),
    setNames: (names) => {
        set({ names });
        cacheNames(names);
    },
    range: null,
    setRange: (range) => set({ range }),
    loading: false,
    setLoading: (loading) => set({ loading }),
    model: getCacheModel(),
    setModel: (model) => {
        set({ model });
        cacheModel(model);
    },
    data: null,
    setData: (data) => set({ data }),
    filterData: (inputNames) => {
        console.log("filterData");
        const { dict, names, range } = get();
        let tmpNames = [...names];
        if(inputNames) {
            tmpNames = inputNames;
            set({ names: inputNames });
        }
        if (tmpNames.length === 0) {
            tmpNames = Object.keys(dict);
        }
        const start = range[0].valueOf();
        const end = range[1].add(1, "day").valueOf();
        const data = {};
        console.log(tmpNames, dict, dict[tmpNames[0]]);
        tmpNames.forEach((name) => {
            data[name] = dict[name].filter(
                (item) => item.ts >= start && item.ts < end
            );
        });
        console.log(data);
        set({ data });
    }
}))

export default useData;