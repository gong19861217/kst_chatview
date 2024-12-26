import { useState, useEffect } from "react";
import { processExcelData, selectExcelAndParse } from "./utils";
import { Button, Select, DatePicker, Radio, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import "dayjs/locale/zh-cn";
import useData from "./useData";

const Inputer = () => {
    const setDict = useData((state) => state.setDict);
    const setFile = useData((state) => state.setFile);
    const file = useData((state) => state.file);
    const names = useData((state) => state.names);
    const setNames = useData((state) => state.setNames);
    const range = useData((state) => state.range);
    const setRange = useData((state) => state.setRange);
    const loading = useData((state) => state.loading);
    const setLoading = useData((state) => state.setLoading);
    const model = useData((state) => state.model);
    const setModel = useData((state) => state.setModel);
    const filterData = useData((state) => state.filterData);
    const [lNames, setLNames] = useState([]);
    const [lModel, setLModel] = useState(null);
    const [allowDate, setAllowDate] = useState(null);
    const [nameOption, setNameOption] = useState([]);

    useEffect(() => {
        setLNames(names);
        setLModel(model);
    }, [names, model])

    const selectFile = async () => {
        setFile(null);
        setDict(null);
        setNames([]);
        setRange(null);
        const { file, data: rawData } = await selectExcelAndParse(() =>
            setLoading(true)
        );
        const { message, data } = await processExcelData(rawData);
        setFile(file);
        setLoading(false);
        if (!data) {
            return message.error(message);
        }
        const { start, end, dict } = data;
        setDict(dict);
        setAllowDate([start, end]);
        setNameOption(
            Object.keys(dict).map((name) => ({ label: name, value: name }))
        );
    };

    const namesChange = (newNames) => {
        newNames = newNames.sort((a, b) => a.localeCompare(b));
        if (newNames.join(",") === names.join(",")) {
            return;
        }
        setLNames(newNames);
    };

    const dateChange = (value) => {
        console.log(value);
        setRange(value);
    };

    const modelChange = (value) => {
        setLModel(value);
    };

    const confirmChange = () => {
        if(!range || !model){
            return message.error("请选择日期范围和模式");
        }
        setLoading(true);
        setNames(lNames);
        setModel(lModel);
        filterData()
    };

    const disabledDate = (currentDate) => {
        if (!allowDate) return true;
        return currentDate < allowDate.start || currentDate > allowDate.end;
    };

    return (
        <div className="flex items-center justify-start">
            <Button
                type={file ? "default" : "primary"}
                onClick={selectFile}
                icon={<UploadOutlined />}
                size="large"
                disabled={loading}
            >
                {file ? file.name : "选择文件"}
            </Button>

            <Select
                mode="multiple"
                className="ml-2 min-w-72"
                size="large"
                placeholder="选择要查看的客服"
                value={lNames}
                maxTagCount={1}
                disabled={loading}
                onChange={(value) => namesChange(value)}
                options={nameOption}
            ></Select>

            <DatePicker.RangePicker
                className="ml-2 min-w-60"
                size="large"
                value={range}
                disabled={loading}
                allowEmpty={[true, true]}
                onChange={dateChange}
                disabledDate={disabledDate}
            />

            <Radio.Group
                className="ml-4 min-w-40"
                block
                size="large"
                options={[
                    { label: "模式1", value: "v1" },
                    { label: "模式2", value: "v2" },
                ]}
                value={lModel}
                onChange={(e) => modelChange(e.target.value)}
                defaultValue="Apple"
                optionType="button"
                buttonStyle="solid"
                disabled={loading}
            />

            <Button
                className="ml-4"
                type="primary"
                danger
                onClick={confirmChange}
                size="large"
                loading={loading}
                disabled={!file}
            >
                生成图表
            </Button>
        </div>
    );
};

export default Inputer;
