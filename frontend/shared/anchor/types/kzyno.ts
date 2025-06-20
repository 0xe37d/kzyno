/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/kzyno.json`.
 */
export type Kzyno = {
  address: 'Har3kPZU49yuvD7etW76fMcj3AW83Q1TbRkz1Y9RjCdv'
  metadata: {
    name: 'kzyno'
    version: '0.1.0'
    spec: '0.1.0'
    description: 'Created with Anchor'
  }
  instructions: [
    {
      name: 'depositFunds'
      discriminator: [202, 39, 52, 211, 53, 20, 250, 88]
      accounts: [
        {
          name: 'signer'
          writable: true
          signer: true
        },
        {
          name: 'userBalance'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 98, 97, 108, 97, 110, 99, 101]
              },
              {
                kind: 'account'
                path: 'signer'
              },
            ]
          }
        },
        {
          name: 'vaultAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
            ]
          }
        },
        {
          name: 'globalState'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'lamportsIn'
          type: 'u64'
        },
      ]
    },
    {
      name: 'depositLiquidity'
      discriminator: [245, 99, 59, 25, 151, 71, 233, 249]
      accounts: [
        {
          name: 'signer'
          writable: true
          signer: true
        },
        {
          name: 'vaultAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
            ]
          }
        },
        {
          name: 'globalState'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]
              },
            ]
          }
        },
        {
          name: 'userLiquidity'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 108, 105, 113, 117, 105, 100, 105, 116, 121]
              },
              {
                kind: 'account'
                path: 'signer'
              },
              {
                kind: 'arg'
                path: 'index'
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'index'
          type: 'u64'
        },
        {
          name: 'lamportsIn'
          type: 'u64'
        },
      ]
    },
    {
      name: 'initialize'
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
        },
        {
          name: 'globalState'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: []
    },
    {
      name: 'playGame'
      discriminator: [37, 88, 207, 85, 42, 144, 122, 197]
      accounts: [
        {
          name: 'signer'
          writable: true
          signer: true
        },
        {
          name: 'userBalance'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 98, 97, 108, 97, 110, 99, 101]
              },
              {
                kind: 'account'
                path: 'user'
              },
            ]
          }
        },
        {
          name: 'globalState'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]
              },
            ]
          }
        },
        {
          name: 'vaultAccount'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
            ]
          }
        },
        {
          name: 'user'
          writable: true
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'chance'
          type: 'u64'
        },
        {
          name: 'randomNumber'
          type: 'u64'
        },
        {
          name: 'wager'
          type: 'u64'
        },
      ]
    },
    {
      name: 'withdrawFunds'
      discriminator: [241, 36, 29, 111, 208, 31, 104, 217]
      accounts: [
        {
          name: 'user'
          writable: true
          signer: true
        },
        {
          name: 'userBalance'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 98, 97, 108, 97, 110, 99, 101]
              },
              {
                kind: 'account'
                path: 'user'
              },
            ]
          }
        },
        {
          name: 'vaultAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
            ]
          }
        },
        {
          name: 'globalState'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'lamportsIn'
          type: 'u64'
        },
      ]
    },
    {
      name: 'withdrawLiquidity'
      discriminator: [149, 158, 33, 185, 47, 243, 253, 31]
      accounts: [
        {
          name: 'signer'
          writable: true
          signer: true
        },
        {
          name: 'vaultAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
            ]
          }
        },
        {
          name: 'globalState'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [103, 108, 111, 98, 97, 108, 95, 115, 116, 97, 116, 101]
              },
            ]
          }
        },
        {
          name: 'userLiquidity'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [117, 115, 101, 114, 95, 108, 105, 113, 117, 105, 100, 105, 116, 121]
              },
              {
                kind: 'account'
                path: 'signer'
              },
              {
                kind: 'arg'
                path: 'index'
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'index'
          type: 'u64'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'globalState'
      discriminator: [163, 46, 74, 168, 216, 123, 133, 98]
    },
    {
      name: 'userBalance'
      discriminator: [187, 237, 208, 146, 86, 132, 29, 191]
    },
    {
      name: 'userLiquidity'
      discriminator: [231, 187, 233, 254, 66, 35, 139, 26]
    },
  ]
  events: [
    {
      name: 'playResult'
      discriminator: [248, 248, 36, 69, 205, 12, 180, 90]
    },
  ]
  errors: [
    {
      code: 6000
      name: 'unauthorized'
      msg: 'Unauthorized access attempt.'
    },
    {
      code: 6001
      name: 'gameStillActive'
    },
    {
      code: 6002
      name: 'notEnoughFundsToPlay'
    },
    {
      code: 6003
      name: 'notEnoughFunds'
    },
    {
      code: 6004
      name: 'incorrectTokenMint'
    },
    {
      code: 6005
      name: 'randomnessAlreadyRevealed'
    },
    {
      code: 6006
      name: 'randomnessNotResolved'
    },
    {
      code: 6007
      name: 'randomnessExpired'
    },
    {
      code: 6008
      name: 'invalidChance'
    },
    {
      code: 6009
      name: 'invalidRandomnessAccount'
    },
    {
      code: 6010
      name: 'overflow'
    },
    {
      code: 6011
      name: 'betTooBig'
    },
    {
      code: 6012
      name: 'insufficientOutput'
    },
    {
      code: 6013
      name: 'liquidityLocked'
    },
  ]
  types: [
    {
      name: 'globalState'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'admin'
            type: 'pubkey'
          },
          {
            name: 'totalShares'
            type: 'u128'
          },
          {
            name: 'accProfitPerShare'
            type: 'i128'
          },
          {
            name: 'userFunds'
            type: 'u64'
          },
          {
            name: 'deposits'
            type: 'u64'
          },
          {
            name: 'lastBankroll'
            type: 'u64'
          },
        ]
      }
    },
    {
      name: 'playResult'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'won'
            type: 'bool'
          },
        ]
      }
    },
    {
      name: 'userBalance'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'balance'
            type: 'u64'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'userLiquidity'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'deposited'
            type: 'u64'
          },
          {
            name: 'shares'
            type: 'u128'
          },
          {
            name: 'profitEntry'
            type: 'i128'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
  ]
}
