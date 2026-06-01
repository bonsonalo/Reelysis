import QueryProvider  from './QueryProvider'
import ReduxProvider from './ReduxProvider'




export default function AppProviders({children}: {children: React.ReactNode}) {
    return (
        <ReduxProvider>
            <QueryProvider>
                {children}
            </QueryProvider>
        </ReduxProvider>
    )
}