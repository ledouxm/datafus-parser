# datafus-parser

This is a simple lib to encode and decode Dofus 2 packets.

# Usage

## Init

First of all, you need to init the parser :
```ts
import { initDatafusParser } from 'datafus-parser'

await initDatafusParser()
```
This will download the latest Datafus release if not already done and load needed files.

## Decoding
```ts
import { writeMessage } from 'datafus-parser'

const messageFromDofus: Buffer = ...

const result = await readMessage(data.toString("hex"));
```

## Encoding
```ts
import { writeMessage } from 'datafus-parser'

const data = {
  recruitmentData: {
    minLevelFacultative: false,
    invalidatedByModeration: false,
    recruitmentAutoLocked: true,
    socialId: 13563,
    recruitmentType: 0,
    recruitmentTitle: '',
    recruitmentText: '',
    selectedLanguages: [ 1 ],
    selectedCriterion: [],
    minLevel: 50,
    lastEditPlayerName: 'Anonimized-Bob',
    lastEditDate: 1686099907132,
    _name: 'GuildRecruitmentInformation',
    minSuccess: 0,
    minSuccessFacultative: false
  },
  _name: 'RecruitmentInformationMessage'
}

const result = await writeMessage(data);
mySocket.send(result.buffer);
```

`data` can be any object representing a dofus entity, it has to have a `_name` prop which identifies the message.

## Advanced

You can specify and owner and a repo when initializing the parser :
```ts
await initDatafusParser({ owner: "ledouxm", repo: "Datafus" });
```
I can be handy for testing purpose.
