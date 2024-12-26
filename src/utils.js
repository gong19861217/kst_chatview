import * as XLSX from "xlsx";
import dayjs from "dayjs";

export function isEnter(status) {
    return status === "在线";
}

export function micSecondToTime(micSecond, isDayTime = false) {
    return secondToTime(micSecond / 1000, isDayTime);
}

export function secondToTime(second, isDayTime = false) {
    let h = Math.floor(second / 3600);
    let m = Math.floor((second % 3600) / 60);
    let s = Math.floor(second % 60);
    if (isDayTime) {
        return `${h.toString().padStart(2, "0")}:${m
            .toString()
            .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    let result = "";
    if (h > 0) {
        result += `${h}小时`;
    }
    if (m > 0) {
        result += `${m}分钟`;
    }
    if (s > 0) {
        result += `${s}秒`;
    }
    return result;
}

export function cacheNames(names) {
    localStorage.setItem("kstchatview_names", JSON.stringify(names));
}

export function getCacheNames() {
    const cached = JSON.parse(localStorage.getItem("kstchatview_names"));
    return cached || [];
}

export function cacheModel(model) {
    localStorage.setItem("kstchatview_model", model);
}

export function getCacheModel() {
    const cached = localStorage.getItem("kstchatview_model");
    return cached || "v1";
}

export function getRandomColor() {
    const lib = new Set();
    function _run() {
        const letters = "0123456789ABCDEF";
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
    const color = _run();
    if (lib.has(color)) {
        return _run();
    }
    lib.add(color);
    return color;
}

// 将十六进制颜色转换为RGB
function hexToRgb(hex) {
    let bigint = parseInt(hex.slice(1), 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;
    return { r, g, b };
}

// 计算亮度
function getBrightness({ r, g, b }) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

// 根据颜色亮度设置背景颜色
export function getBackgroundColor(hexColor) {
    const rgb = hexToRgb(hexColor);
    const brightness = getBrightness(rgb);

    // 亮度阈值为128，低于128使用白色背景，高于128使用黑色背景
    return brightness < 128 ? "#FFFFFF" : "#000000";
}

export async function selectFile(onChange, accept, multiple = false) {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.multiple = multiple;
        input.onchange = (e) => {
            onChange && onChange(e);
            // @ts-ignore
            resolve(e.target.files);
        };
        input.click();
    });
}

export async function selectExcel(onChange) {
    return await selectFile(onChange, ".xls,.xlsx");
}

export async function selectExcelAndParse(onChange) {
    const files = await selectExcel(onChange);
    if (files) {
        const file = files[0];
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        return new Promise((resolve, reject) => {
            reader.onload = (e) => {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                resolve({
                    file,
                    data: json,
                });
            };
            reader.onerror = reject;
        });
    }
}

export async function processExcelData(data) {
    const [header, ...rows] = data;
    if (header.join(",") !== window.headerLib.join(",")) {
        return {
            code: -1,
            message: "文件格式有变化, 请先更新头部列表",
        };
    }

    const dict = {};
    let index = 1,
        minDateTs = Number.MAX_SAFE_INTEGER,
        maxDateTs = 0;
    for (const line of rows) {
        index++;
        const [
            // eslint-disable-next-line no-unused-vars
            name, _loginTime, _logoutTime, _ip, _mac, _region, product, _terminal, statusStr,
        ] = line;

        if (name === "客服姓名" || product === "管理端") continue;

        const statusArr = statusStr
            .split("；")
            .filter((s) => s.trim() !== "");

        if (statusArr.length === 0) {
            return {
                code: -1,
                message: `第${index}行状态变更为空, 请检查是否有错误!`,
            };
        }
        
        const lineStatus = [];
        for (const status of statusArr) {
            const matched = status.match(
                /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})[^']+'([^']+)'$/
            );
            if (!matched) {
                return {
                    code: -1,
                    message: `第${index}行状态[${status}]格式匹配有误, 请检查是否有错误!`,
                };
            }
            const dateTs = dayjs(matched[1].split(" ")[0]).valueOf();
            minDateTs = Math.min(minDateTs, dateTs);
            maxDateTs = Math.max(maxDateTs, dateTs);

            lineStatus.push({
                index: dateTs,
                raw: status,
                time: matched[1],
                ts: dayjs(matched[1]).valueOf(),
                isin: isEnter(matched[2]),
            });
        }
        if(lineStatus.length === 0) continue;
        let currIsin = lineStatus[0].isin;
        const filteredStatus = lineStatus.filter(s => {
            if(s.isin === currIsin){
                currIsin = !s.isin;
                return true;
            }
        });
        // for(const status of lineStatus.slice(1)){
        //     if(status.isin === currIsin){
        //         continue;
        //     }
        //     currIsin = status.isin;
        //     filteredStatus.push(status);
        // }
        if (!dict[name]) {
            dict[name] = filteredStatus.slice(filteredStatus.findIndex(s => s.isin));
        } else {
            let preStatus = filteredStatus;
            let lastStatus =dict[name];
            if(preStatus.at(-1).isin) {
                if(lastStatus[0].isin){
                    const dstr = dayjs(preStatus[0].index).format("YYYY-MM-DD 23:59:59");
                    preStatus.push({
                        index: preStatus[0].index,
                        raw: `${dstr}状态变更为'离线'`,
                        time: dstr,
                        ts: dayjs(dstr).valueOf(),
                        isin: false,
                    });
                }
            }else{
                lastStatus = lastStatus.slice(filteredStatus.findIndex(s => s.isin));
            }
            dict[name] = [...preStatus, ...lastStatus];
        }
    }

    return {
        code: 0,
        data: {
            start: dayjs(minDateTs),
            end: dayjs(maxDateTs),
            dict,            
        }
    }
}

// 防抖函数
export function debounce(fn, delay) {
    let timer = null;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(context, args);
        }, delay);
    };
}
