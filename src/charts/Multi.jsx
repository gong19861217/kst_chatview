import * as echarts from 'echarts/core';
import {
    ToolboxComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    DataZoomComponent
  } from 'echarts/components';
  import { BarChart } from 'echarts/charts';
  import { CanvasRenderer } from 'echarts/renderers';
  
  echarts.use([
    ToolboxComponent,
    TooltipComponent,
    DataZoomComponent,
    GridComponent,
    LegendComponent,
    BarChart,
    CanvasRenderer
  ]);
import { memo, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { secondToTime } from "../utils";
import useData from '../useData';

function getRange(start, end, dict) {
    const startd = dayjs(start);
    const endd = dayjs(end);
    if(startd.isSame(endd, "day")) {
        const date = startd.format("YYYY-MM-DD");
        const diff = end - start;
        dict[date] = dict[date] === undefined ? diff: dict[date] + diff;
    }else{
        const startDate = startd.format("YYYY-MM-DD");
        const endDate = endd.format("YYYY-MM-DD");
        let startDiff = dayjs(`${startDate} 23:59:59`).valueOf() - start;
        let endDiff = end - dayjs(`${endDate} 00:00:00`).valueOf();
        dict[startDate] = dict[startDate] === undefined ? startDiff: dict[startDate] + startDiff;
        dict[endDate] = dict[endDate] === undefined ? endDiff: dict[endDate] + endDiff;
    }
}

function processData(datamap) {
    const series = [];
    const datesSet = new Set();
    const nameMapData = {}
    for(const [name, data] of Object.entries(datamap)) {
        const dict = {}
        for (let i = 0; i < data.length; i++) {
            const { isin, ts } = data[i];
            if (!isin || (data[i + 1] && data[i + 1].isin)) continue;
            if(data[i + 1] === undefined && Date.now() - ts > 28800000) continue;
            const end = data[i + 1] === undefined ? Date.now() : data[i + 1].ts;
            getRange(ts, end, dict);
        }
        Object.keys(dict).forEach((date) => {
            datesSet.add(date);
        })
        nameMapData[name] = dict;
    }
    const dates = [...datesSet].sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
    for(const [name, data] of Object.entries(nameMapData)) {
        const tmp = {
            name: name,
            type: "bar",
            data: [],
            emphasis: {
              focus: 'series'
            },
            label: {
                show: true,
                position: 'insideBottom',
                distance: 15,
                align: 'left',
                verticalAlign: 'middle',
                rotate: 90,
                formatter: function(params) {
                    const {seriesName, data} = params
                    return `${seriesName} [${secondToTime(data)}]`
                },
                fontSize: 12,
            },
            tooltip: {
                formatter: (params) => {
                    const name = params.seriesName
                    const value = secondToTime(params.data);
                    return `<p class="flex flex-col items-center text-center"><span class="font-bold mb-2">${name} <br/> 在线${value}</span><p>`;
                }
            }
        }
        for(const date of dates) {
            tmp.data.push(!data[date] ? null : Math.floor(data[date] / 1000));
        }   
        series.push(tmp)
    }
    return {
        xAxisData: dates,
        series,
    }
}

const Multi = () => {
    const datamap = useData((state) => state.data);
    const setLoading = useData((state) => state.setLoading);
    const filterData = useData((state) => state.filterData);
    const chart = useRef(null);
    
    const chartElRef = useCallback((node) => {
        console.log("init chart")
        if (node !== null) {
            if(chart.current) {
                chart.current.dispose();
                chart.current = null;
            }
            chart.current = echarts.init(node);
            
            chart.current.on('click', 'series.bar', function (e) {
                filterData([e.seriesName]);
                chart.current.dispose();
                chart.current = null;
            });
        }
    }, [filterData]);

    useEffect(() => {
        console.log("update chart", datamap)
        if(!datamap) return;
        chart.current.showLoading();
        console.time("multi");
        const {xAxisData, series} = processData(datamap)
        console.timeEnd("multi");
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
                type: 'slider'
                },
                {
                type: 'inside'
                }
            ],
            legend: {
                selectedMode: true,
            },
            grid,
            yAxis: {
                type: "value",
            },
            xAxis: {
                type: "category",
                data: xAxisData,
                nameRotate: 90,
                axisLabel:{
                    interval: 0,
                    rotate: 0,
                }
            },
            series,
        };
        option && chart.current.setOption(option);

        setLoading(false)
        chart.current.hideLoading();
    }, [datamap, setLoading]);

    return <div ref={chartElRef} className="w-full h-full"></div>;
};

export default memo(Multi);
