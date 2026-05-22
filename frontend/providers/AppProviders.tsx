import QueryProviders  from './QueryProviders'
import ReduxProvider from './ReduxProvider'




export default function AppProviders({children}: {children: React.ReactNode}) {
    return (
        <ReduxProvider>
            <QueryProviders>
                {children}
            </QueryProviders>
        </ReduxProvider>
    )
}