import React, { useMemo, useState } from 'react'
import { AutoColumn } from '../../components/Column'
import styled from 'styled-components'
import { MIGRATIONS, STAKING_REWARDS_INFO, useStakingInfo } from '../../state/stake/hooks'
import { TYPE, ExternalLink } from '../../theme'
import PoolCard from '../../components/earn/PoolCard'
import { RouteComponentProps } from 'react-router-dom'
import { RowBetween } from '../../components/Row'
import { CardSection, DataCard, CardNoise, CardBGImage } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { useActiveWeb3React } from '../../hooks'
import { JSBI } from '@pangolindex/sdk'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

export default function Earn({
  match: {
    params: { version }
  }
}: RouteComponentProps<{ version: string }>) {
  const { chainId } = useActiveWeb3React()
  const stakingInfos = useStakingInfo(Number(version))
  const [stakingInfoResults, setStakingInfoResults] = useState<any[]>()

  useMemo(() => {
    Promise.all(
      stakingInfos
        ?.sort(function(info_a, info_b) {
          // only first has ended
          if (info_a.isPeriodFinished && !info_b.isPeriodFinished) return 1
          // only second has ended
          if (!info_a.isPeriodFinished && info_b.isPeriodFinished) return -1
          // greater stake in avax comes first
          return info_a.totalStakedInWavax?.greaterThan(info_b.totalStakedInWavax ?? JSBI.BigInt(0)) ? -1 : 1
        })
        .sort(function(info_a, info_b) {
          // only the first is being staked, so we should bring the first up
          if (info_a.stakedAmount.greaterThan(JSBI.BigInt(0)) && !info_b.stakedAmount.greaterThan(JSBI.BigInt(0))) return -1
          // only the second is being staked, so we should bring the first down
          if (!info_a.stakedAmount.greaterThan(JSBI.BigInt(0)) && info_b.stakedAmount.greaterThan(JSBI.BigInt(0))) return 1
          return 0
        })
        .map(stakingInfo => {
          return fetch(`https://api.pangolin.exchange/pangolin/apr/${stakingInfo.stakingRewardAddress}`)
            .then(res => res.text())
            .then(res => ({ apr: res, ...stakingInfo }))
        })
    ).then(results => {
      setStakingInfoResults(results)
    })
  }, [stakingInfos?.length])

  const DataRow = styled(RowBetween)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
     flex-direction: column;
   `};
  `

  const stakingRewardsExist = Boolean(typeof chainId === 'number' && (STAKING_REWARDS_INFO[chainId]?.length ?? 0) > 0)

  return (
    <PageWrapper gap="lg" justify="center">
      <TopSection gap="md">
        <DataCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>Pangolin liquidity mining</TYPE.white>
              </RowBetween>
              <RowBetween>
                <TYPE.white fontSize={14}>
                  Deposit your Pangolin Liquidity Provider PGL tokens to receive PNG, the Pangolin protocol governance
                  token.
                </TYPE.white>
              </RowBetween>{' '}
              <ExternalLink
                style={{ color: 'white', textDecoration: 'underline' }}
                href="https://pangolin.exchange/litepaper"
                target="_blank"
              >
                <TYPE.white fontSize={14}>Read more about PNG</TYPE.white>
              </ExternalLink>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </DataCard>
      </TopSection>

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Participating pools</TYPE.mediumHeader>
        </DataRow>

        <PoolSection>
          {stakingRewardsExist && stakingInfos?.length === 0 ? (
            <Loader style={{ margin: 'auto' }} />
          ) : !stakingRewardsExist ? (
            'No active rewards'
          ) : (
            stakingInfoResults?.map(stakingInfo => (
              <PoolCard
                apr={stakingInfo.apr}
                key={stakingInfo.stakingRewardAddress}
                stakingInfo={stakingInfo}
                migration={MIGRATIONS.find(migration => migration.from.stakingRewardAddress === stakingInfo.stakingRewardAddress)?.to}
                version={version}
              />
            ))
          )}
        </PoolSection>
      </AutoColumn>
    </PageWrapper>
  )
}
