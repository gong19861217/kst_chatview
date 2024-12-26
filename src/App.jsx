import { ConfigProvider } from "antd";
import "dayjs/locale/zh-cn";
import zhCN from "antd/locale/zh_CN";
import Content from "./Content";
import Inputer from "./Inputer";

function App() {

    return (
        <div className="w-full h-screen overflow-auto flex flex-col">
            <ConfigProvider locale={zhCN}>
                <header className="p-4 shadow">
                    <Inputer />
                </header>
                <main className="flex-1 w-full py-4">
                    <Content />
                </main>
            </ConfigProvider>
        </div>
    );
}

export default App;
