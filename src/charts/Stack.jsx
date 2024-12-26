import * as echarts from "echarts/core";
import {
    ToolboxComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent,
} from "echarts/components";
import { BarChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
    ToolboxComponent,
    TooltipComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    CanvasRenderer,
]);
import { useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { getBackgroundColor, getRandomColor, micSecondToTime } from "../utils";
import useData from "../useData";

function appendValuePiece(start, end, dict) {
    const date = dayjs(start).format("YYYY-MM-DD");
    const todayStart = dayjs(`${date} 00:00:00`).valueOf();
    if (!dict[date]) {
        dict[date] = {
            start: 0,
            values: [],
        };
    }
    const diffStart = start - todayStart;
    const diffEnd = end - todayStart;
    dict[date].values.push(
        { type: "s", value: diffStart - dict[date].start },
        {
            type: "v",
            value: diffEnd - diffStart,
            start: micSecondToTime(diffStart, true),
            end: micSecondToTime(diffEnd, true),
            duration: micSecondToTime(diffEnd - diffStart),
        }
    );
    dict[date].start = diffEnd;
}

function fillRangeByDate(start, end, dict) {
    const startd = dayjs(start);
    const endd = dayjs(end);
    if (startd.isSame(endd, "day")) {
        appendValuePiece(start, end, dict);
    } else {
        const startDate = startd.format("YYYY-MM-DD");
        const endDate = endd.format("YYYY-MM-DD");
        appendValuePiece(start, dayjs(`${startDate} 23:59:59`).valueOf(), dict);
        appendValuePiece(dayjs(`${endDate} 00:00:00`).valueOf(), end, dict);
    }
}

function syncDict(dict) {
    const maxLen = Object.values(dict).reduce((max, item) => {
        return item.values.length > max ? item.values.length : max;
    }, 0);

    for (const data of Object.values(dict)) {
        const newValues = [];
        for (let i = 0; i < maxLen; i++) {
            if (data.values[i]) {
                newValues.push(data.values[i]);
            } else if (i % 2 === 0) {
                newValues.push({ type: "s", value: 0 });
            } else {
                newValues.push({
                    type: "v",
                    value: 0,
                    start: "",
                    end: "",
                    duration: "",
                });
            }
        }
        data.values = newValues;
    }
    return maxLen;
}

function processData(datamap) {
    const series = [];
    const datesSet = new Set();
    const nameMapData = {};
    const nameMapMaxLen = {};
    const legend = [];
    // let ccc = new Set();
    for (const [name, data] of Object.entries(datamap)) {
        // if(ccc.size > 2) break;
        // console.log([...ccc])
        // ccc.add(name)
        const dict = {};
        for (let i = 0; i < data.length; i++) {
            const { isin, ts } = data[i];
            // if(time.startsWith("2024-12-23")){
            //     console.log(data[i], time)
            // }
            if (!isin || (data[i + 1] && data[i + 1].isin)) continue;
            if (data[i + 1] === undefined && Date.now() - ts > 28800000)
                continue;
            const end = data[i + 1] === undefined ? Date.now() : data[i + 1].ts;
            // if(time.startsWith("2024-12-23")){
            //     console.log(data[i].time, data[i + 1].time)
            // }
            fillRangeByDate(ts, end, dict);
        }
        nameMapMaxLen[name] = syncDict(dict);
        Object.keys(dict).forEach((date) => {
            datesSet.add(date);
        });
        nameMapData[name] = dict;
    }
    const dates = [...datesSet].sort(
        (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf()
    );
    for (const [name, data] of Object.entries(nameMapData)) {
        legend.push(name);
        const color = getRandomColor();
        const bgColor = getBackgroundColor(color);
        for (let i = 0; i < nameMapMaxLen[name]; i++) {
            const serieTemp = {
                name: `${name}_${i}`,
                // name: name,
                type: "bar",
                stack: name,
                itemStyle: {
                    borderColor: color,
                    color: color,
                },
                emphasis: {
                    focus: "self",
                },
                data: [],
                label: {
                    show: false,
                },
                tooltip: {
                    formatter: (params) => {
                        if (!params.data.raw.start) {
                            return "";
                        }
                        const { name, start, end, duration, total } =
                            params.data.raw;
                        const date = params.name;
                        return `
                        <div>
                            <table>
                                <tr>
                                    <td class="border px-2 py-1">日期</td>
                                    <td class="border px-2 py-1">${date}</td>
                                </tr>
                                <tr>
                                    <td class="border px-2 py-1">客服</td>
                                    <td class="border px-2 py-1">${name}</td>
                                </tr>
                                <tr>
                                    <td class="border px-2 py-1">上线时间</td>
                                    <td class="border px-2 py-1">${start}</td>
                                </tr>
                                <tr>
                                    <td class="border px-2 py-1">离线时间</td>
                                    <td class="border px-2 py-1">${end}</td>
                                </tr>
                                <tr>
                                    <td class="border px-2 py-1">持续时间</td>
                                    <td class="border px-2 py-1">${duration}</td>
                                </tr>
                                <tr>
                                    <td class="border px-2 py-1">当日总在线</td>
                                    <td class="border px-2 py-1">${total}</td>
                                </tr>
                            </table>
                        <div>`;
                    },
                },
            };
            if (i % 2 === 0) {
                serieTemp.itemStyle = {
                    borderColor: "transparent",
                    color: "transparent",
                };
                serieTemp.tooltip = {
                    show: false,
                };
                serieTemp.emphasis.disabled = true;
            }
            if (i === 0) {
                serieTemp.label = {
                    show: true,
                    position: "insideBottom",
                    distance: 15,
                    align: "left",
                    verticalAlign: "middle",
                    rotate: 90,
                    formatter: function (params) {
                        const { name, total } = params.data.raw;
                        return !total
                            ? `${name} [未上线]`
                            : `${name} [${total}]`;
                    },
                    fontSize: 12,
                    color: color,
                    backgroundColor: bgColor,
                    padding: [1, 4],
                };
            }
            for (const date of dates) {
                const value = data[date];
                if (value) {
                    const total = value.values.reduce((acc, cur) => {
                        if (cur.type === "v") {
                            return acc + cur.value;
                        }
                        return acc;
                    }, 0);
                    serieTemp.data.push({
                        value:
                            value.values[i].value < 1
                                ? null
                                : value.values[i].value,
                        raw: {
                            ...value.values[i],
                            name,
                            total: micSecondToTime(total),
                        },
                    });
                } else {
                    serieTemp.data.push({ value: 0, raw: { name } });
                }
            }
            series.push(serieTemp);
        }
    }
    return {
        xAxisData: dates,
        series,
        legend,
    };
}

const Stack = () => {
    const datamap = useData((state) => state.data);
    const setLoading = useData((state) => state.setLoading);
    const filterData = useData((state) => state.filterData);
    const chart = useRef(null);

    const chartElRef = useCallback(
        (node) => {
            console.log("init chart");
            if (node !== null) {
                if (chart.current) {
                    chart.current.dispose();
                    chart.current = null;
                }
                chart.current = echarts.init(node);

                chart.current.on("click", "series.bar", function (e) {
                    filterData([e.data.raw.name]);
                });
            }
        },
        [filterData]
    );
    useEffect(() => {
        if(!datamap) return;
        chart.current.showLoading();
        console.time("stack");
        const { xAxisData, series } = processData(datamap);
        console.timeEnd("stack");
        var option;
        const grid = {
            left: 100,
            right: 100,
            top: 100,
            bottom: 100,
        };
        option = {
            tooltip: {},
            dataZoom: [
                {
                    type: "slider",
                },
                {
                    type: "inside",
                },
            ],
            // legend: {
            //     // selectedMode: true,
            //     // data: legend
            // },
            grid,
            yAxis: {
                type: "value",
                interval: 3600000,
                max: 86400000,
                axisLabel: {
                    formatter: function (value) {
                        return value / 3600000 + "点";
                    },
                },
            },
            xAxis: {
                type: "category",
                data: xAxisData,
                nameRotate: 90,
                axisLabel: {
                    interval: 0,
                    rotate: 0,
                },
            },
            series,
        };
        option && chart.current.setOption(option);

        setLoading(false)
        chart.current.hideLoading();
    }, [datamap, setLoading]);

    return <div ref={chartElRef} className="w-full h-full"></div>;
};

export default Stack;
